/**
 * GET /api/poi?pts=lat,lng;lat,lng&radius=25000&cats=castle,view,museum
 * GET /api/poi?bbox=s,w,n,e&cats=castle,view
 *
 * Proxy serveur vers l'API Overpass (OpenStreetMap) pour la découverte
 * dynamique de vrais lieux (châteaux, panoramas, nature, musées…).
 *
 * Pourquoi un proxy plutôt qu'un appel direct depuis le navigateur :
 *  - En-têtes propres (Accept + User-Agent) → évite les 406 de certains miroirs.
 *  - Rotation automatique sur plusieurs miroirs Overpass + timeout maîtrisé.
 *  - Requêtes légères (node/way, correspondances EXACTES indexées, pas de regex).
 *  - Mise en cache CDN (Cache-Control s-maxage) : une zone déjà explorée est
 *    renvoyée instantanément sans re-solliciter Overpass → fiabilité++.
 */

// Miroirs Overpass, essayés dans l'ordre (les plus rapides d'abord ;
// kumi est souvent surchargé → en dernier recours).
const OVERPASS_EPS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

// Catégorie → sélecteurs OSM en correspondance EXACTE (indexés, rapides).
// On garde peu de sélecteurs par catégorie pour alléger la requête Overpass.
const CAT_SEL = {
  castle:   ['["historic"="castle"]', '["historic"="fort"]', '["historic"="palace"]'],
  heritage: ['["historic"="monument"]', '["historic"="memorial"]', '["historic"="ruins"]'],
  view:     ['["tourism"="viewpoint"]'],
  nature:   ['["natural"="peak"]', '["natural"="waterfall"]', '["leisure"="nature_reserve"]'],
  museum:   ['["tourism"="museum"]'],
  sight:    ['["tourism"="attraction"]']
};

// Tags conservés dans la réponse (payload compact pour le client).
const KEEP_TAGS = ["name", "historic", "tourism", "natural", "waterway", "leisure",
  "wikipedia", "wikidata", "heritage", "whc:inscription_date", "addr:city", "operator", "heritage:operator"];

function buildQuery(cats, clause, cap) {
  let body = "";
  cats.forEach((c) => (CAT_SEL[c] || []).forEach((sel) => {
    // Nodes uniquement : les « way » imposent le calcul de centroïde (out center),
    // très coûteux et principale cause de timeout côté miroir. La grande majorité
    // des panoramas, sommets, monuments et châteaux existent en tant que node.
    body += "node" + sel + '["name"]' + clause + ";";
  }));
  return "[out:json][timeout:15];(" + body + ");out " + cap + ";";
}

async function fetchMirror(ep, query, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(ep, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "road-trip-moto/1.0 (+https://road-hazel.vercel.app)"
      },
      body: "data=" + encodeURIComponent(query),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    if (!d || !Array.isArray(d.elements)) throw new Error("réponse inattendue");
    // Un miroir saturé renvoie [] + un remark « timed out » → on le rejette
    // pour laisser gagner un autre miroir de la course.
    if (!d.elements.length && d.remark && /timed out|runtime error/i.test(d.remark)) {
      throw new Error("miroir saturé");
    }
    return d.elements;
  } finally {
    clearTimeout(timer);
  }
}

// Course parallèle sur tous les miroirs : la latence = le miroir le plus rapide
// (et non la somme). Le premier qui renvoie des données valides gagne.
async function runOverpass(query) {
  const tasks = OVERPASS_EPS.map((ep) => fetchMirror(ep, query, 12000));
  try {
    return await Promise.any(tasks);
  } catch (agg) {
    const errs = (agg && agg.errors) || [];
    throw new Error("tous les miroirs Overpass ont échoué" +
      (errs.length ? " (" + errs.map((e) => e.message).join(", ") + ")" : ""),
      { cause: agg });
  }
}

// Découverte multi-catégories : UNE requête légère par catégorie, toutes lancées
// en parallèle (chacune faisant sa propre course de miroirs). Cumuler plusieurs
// sélecteurs dans une seule requête sature les miroirs ; les séparer garde chaque
// requête rapide. Un échec partiel n'empêche pas les autres catégories de réussir.
async function discoverCats(cats, clause, capPer) {
  const settled = await Promise.allSettled(
    cats.map((c) => runOverpass(buildQuery([c], clause, capPer)))
  );
  const els = [];
  const errs = [];
  let anyOk = false;
  settled.forEach((r) => {
    if (r.status === "fulfilled") { anyOk = true; els.push.apply(els, r.value); }
    else errs.push(r.reason && r.reason.message ? r.reason.message : String(r.reason));
  });
  if (!anyOk) throw new Error(errs.join(" ; ") || "aucune catégorie disponible");
  return els;
}

function pickTags(t) {
  if (!t) return null;
  const o = {};
  KEEP_TAGS.forEach((k) => { if (t[k] != null) o[k] = t[k]; });
  return o;
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée (GET requis)" });
    return;
  }
  const q = req.query || {};
  const cats = String(q.cats || "").split(",").map((s) => s.trim()).filter((c) => CAT_SEL[c]);
  if (!cats.length) {
    res.status(400).json({ ok: false, error: "Paramètre 'cats' requis (ex : castle,view,museum)" });
    return;
  }
  const cap = Math.min(90, Math.max(10, parseInt(q.cap, 10) || 60));

  let clause;
  if (q.bbox) {
    const b = String(q.bbox).split(",").map(Number);
    if (b.length !== 4 || b.some((x) => !Number.isFinite(x))) {
      res.status(400).json({ ok: false, error: "bbox invalide (attendu : s,w,n,e)" });
      return;
    }
    clause = "(" + b[0].toFixed(4) + "," + b[1].toFixed(4) + "," + b[2].toFixed(4) + "," + b[3].toFixed(4) + ")";
  } else {
    const radius = Math.min(60000, Math.max(3000, parseInt(q.radius, 10) || 25000));
    const pts = String(q.pts || "")
      .split(";")
      .map((s) => s.split(",").map(Number))
      .filter((a) => a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]));
    if (!pts.length) {
      res.status(400).json({ ok: false, error: "Paramètre 'pts' (lat,lng;…) ou 'bbox' requis" });
      return;
    }
    // Cap défensif : au-delà de 12 points, on échantillonne pour garder la requête légère.
    const capped = pts.length > 12 ? pts.filter((_, i) => i % Math.ceil(pts.length / 12) === 0) : pts;
    clause = "(around:" + radius + "," + capped.map((p) => p[0].toFixed(4) + "," + p[1].toFixed(4)).join(",") + ")";
  }

  try {
    // Une requête par catégorie, en parallèle (voir discoverCats).
    const capPer = Math.min(50, Math.max(20, cap));
    const els = await discoverCats(cats, clause, capPer);
    const seen = new Set();
    const out = [];
    for (const e of els) {
      const lat = e.lat != null ? e.lat : (e.center && e.center.lat);
      const lon = e.lon != null ? e.lon : (e.center && e.center.lon);
      const tags = pickTags(e.tags);
      if (lat == null || lon == null || !tags || !tags.name) continue;
      const key = e.type + "/" + e.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: e.type, id: e.id, lat, lon, tags });
    }
    // Cache CDN : une même zone n'interroge Overpass qu'une fois par jour.
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ ok: true, count: out.length, elements: out });
  } catch (error) {
    res.status(502).json({ ok: false, error: "Service OpenStreetMap indisponible ou surchargé", detail: String((error && error.message) || error) });
  }
}

module.exports = handler;
module.exports.buildQuery = buildQuery;
