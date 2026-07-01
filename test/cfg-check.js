// Teste la LOGIQUE du configurateur de voyage (étapes intermédiaires, mode boucle,
// budget, score) en EXTRAYANT les vraies fonctions depuis index.html — comme poi-check.js.
// On ne réimplémente rien : on exécute le code réel dans un bac à sable.
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function one(re, label){ const m = html.match(re); assert.ok(m, 'introuvable : ' + (label || re)); return m[0]; }
function slice(a, b){ const i = html.indexOf(a); const j = html.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, 'slice ' + a); return html.slice(i, j); }

// Morceaux de source réels (data + helpers + bloc de fonctions du configurateur)
const srcCityKey = one(/const _cityKey = [^\n]+;/, '_cityKey');
const srcHaversine = one(/function haversine\(a, b\)\{[\s\S]*?\n      \}/, 'haversine');
const srcFlag = one(/function cfgFlag\(cc\)\{[^\n]+\}/, 'cfgFlag');
const srcToll = one(/const CFG_TOLL = \{[^\n]+\};/, 'CFG_TOLL');
const srcEuro = one(/const EURO_DESTS = \[[\s\S]*?\n      \];/, 'EURO_DESTS');
const srcStops = one(/const CFG_STOPS = \[[\s\S]*?\n      \];/, 'CFG_STOPS');
const srcFns = slice('function cfgProject(o, dest, p){', 'function cfgGenerate(surprise){');

const body = `
  let __ORIGIN = { name:'Troyes', lat:48.2973, lng:4.0744, flag:'FR' };
  function setOrigin(o){ __ORIGIN = o; }
  function getOrigin(){ return __ORIGIN; }
  ${srcCityKey}
  ${srcHaversine}
  ${srcFlag}
  ${srcToll}
  ${srcEuro}
  ${srcStops}
  ${srcFns}
  return { setOrigin, getOrigin, EURO_DESTS, CFG_STOPS, CFG_TOLL,
    cfgProject, cfgPathKm, cfgCandidates, cfgStopCount, cfgPickSpaced,
    cfgStopsBetween, cfgLoop, cfgCompute, cfgScore };
`;
const cfg = new Function(body)();

const TROYES = { name:'Troyes', lat:48.2973, lng:4.0744, flag:'FR' };
const dest = name => { const d = cfg.EURO_DESTS.find(x => x.name.includes(name)); assert.ok(d, 'dest ' + name); return d; };
const baseInp = over => Object.assign({ budget:1500, days:10, dailyKm:260, conso:5.8, price:1.95, night:55, themes:[], mode:'rt' }, over || {});

// ── cfgProject : projection sur l'axe origine→destination ──────────
test('cfgProject : p=origine → t≈0, p=destination → t≈1, perp≈0', () => {
  const o = { lat:48, lng:4 }, d = { lat:59, lng:24 };
  const a = cfg.cfgProject(o, d, o), b = cfg.cfgProject(o, d, d);
  assert.ok(Math.abs(a.t) < 1e-9 && a.perp < 1e-6, 'origine t=0');
  assert.ok(Math.abs(b.t - 1) < 1e-9 && b.perp < 1e-6, 'destination t=1');
});

test('cfgProject : milieu géométrique → t≈0.5 et perp≈0', () => {
  const o = { lat:48, lng:4 }, d = { lat:59, lng:24 };
  const mid = { lat:(o.lat+d.lat)/2, lng:(o.lng+d.lng)/2 };
  const r = cfg.cfgProject(o, d, mid);
  assert.ok(Math.abs(r.t - 0.5) < 1e-9, 't=0.5');
  assert.ok(r.perp < 1e-6, 'perp=0');
});

test('cfgProject : deux points de part et d\'autre → côtés opposés', () => {
  const o = { lat:48, lng:4 }, d = { lat:59, lng:24 };
  const mid = { lat:(o.lat+d.lat)/2, lng:(o.lng+d.lng)/2 };
  const north = cfg.cfgProject(o, d, { lat:mid.lat + 1, lng:mid.lng });
  const south = cfg.cfgProject(o, d, { lat:mid.lat - 1, lng:mid.lng });
  assert.notStrictEqual(north.side, south.side, 'sides opposés');
  assert.ok(north.perp > 1 && south.perp > 1, 'écart latéral réel');
});

// ── cfgStopCount : nombre d'étapes selon la distance ───────────────
test('cfgStopCount : 1 étape sous 230 km, plafonné à 3', () => {
  assert.strictEqual(cfg.cfgStopCount(150), 1);
  assert.strictEqual(cfg.cfgStopCount(430), 1);
  assert.strictEqual(cfg.cfgStopCount(860), 2);
  assert.strictEqual(cfg.cfgStopCount(1290), 3);
  assert.strictEqual(cfg.cfgStopCount(5000), 3, 'plafond 3');
});

// ── cfgStopsBetween : étapes réellement sur l'axe ──────────────────
test('cfgStopsBetween : Troyes→Tallinn place le bon nombre d\'étapes, toutes sur l\'axe', () => {
  const d = dest('Tallinn');
  const stops = cfg.cfgStopsBetween(TROYES, d);
  const expected = cfg.cfgStopCount(haversineKm(TROYES, d));
  assert.strictEqual(stops.length, expected, 'nombre d\'étapes');
  stops.forEach(s => { assert.ok(s.t >= 0.1 && s.t <= 0.9, s.name + ' sur l\'axe'); });
  const names = stops.map(s => s.name);
  assert.strictEqual(new Set(names).size, names.length, 'pas de doublon');
});

test('cfgStopsBetween : déterministe (deux appels identiques)', () => {
  const d = dest('Barcelone');
  const a = cfg.cfgStopsBetween(TROYES, d).map(s => s.name);
  const b = cfg.cfgStopsBetween(TROYES, d).map(s => s.name);
  assert.deepStrictEqual(a, b);
});

test('cfgStopsBetween : n\'inclut jamais l\'origine ni la destination', () => {
  const d = dest('Prague');
  const names = cfg.cfgStopsBetween(TROYES, d).map(s => s.name.toLowerCase());
  assert.ok(!names.includes('troyes') && !names.includes('prague'));
});

// ── cfgLoop : retour par un AUTRE chemin ───────────────────────────
test('cfgLoop : étapes aller et retour totalement disjointes', () => {
  const d = dest('Tallinn');
  const out = cfg.cfgStopsBetween(TROYES, d);
  const loop = cfg.cfgLoop(TROYES, d, out);
  const outNames = new Set(out.map(s => s.name));
  loop.ret.forEach(s => assert.ok(!outNames.has(s.name), s.name + ' ne doit pas être dans l\'aller'));
});

test('cfgLoop : total = aller + retour, et les deux > 0', () => {
  const d = dest('Barcelone');
  const out = cfg.cfgStopsBetween(TROYES, d);
  const loop = cfg.cfgLoop(TROYES, d, out);
  assert.ok(loop.outKm > 0 && loop.retKm > 0, 'distances positives');
  assert.strictEqual(loop.total, loop.outKm + loop.retKm, 'total = somme');
});

// ── cfgCompute : agrégat budget + temps ────────────────────────────
test('cfgCompute (aller-retour) : rt = aller simple ×2, pas de boucle', () => {
  const d = dest('Nice');
  const m = cfg.cfgCompute(d, baseInp());
  assert.strictEqual(m.mode, 'rt');
  assert.strictEqual(m.rt, m.owKm * 2, 'rt = owKm×2');
  assert.strictEqual(m.loop, null);
  assert.strictEqual(m.stopsRet.length, 0);
  assert.ok(m.owKm > 0 && m.total > 0);
  assert.strictEqual(m.fitBudget, m.total <= 1500);
  assert.strictEqual(m.fitTime, m.onSite >= 1);
});

test('cfgCompute (boucle) : rt = total de la boucle, étapes retour présentes', () => {
  const d = dest('Tallinn');
  const m = cfg.cfgCompute(d, baseInp({ mode:'loop' }));
  assert.ok(m.loop, 'objet loop présent');
  assert.strictEqual(m.rt, m.loop.total, 'rt = boucle.total');
  assert.deepStrictEqual(m.stopsRet, m.loop.ret);
  assert.ok(m.stopsRet.length >= 1, 'au moins une étape retour pour une longue boucle');
});

test('cfgCompute : un budget plus grand rend la destination faisable', () => {
  const d = dest('Tallinn');
  const serre = cfg.cfgCompute(d, baseInp({ budget:300 }));
  const large = cfg.cfgCompute(d, baseInp({ budget:9000 }));
  assert.strictEqual(serre.fitBudget, false);
  assert.strictEqual(large.fitBudget, true);
  assert.strictEqual(serre.total, large.total, 'le coût ne dépend pas du budget');
});

// ── cfgScore : pondération du classement ───────────────────────────
test('cfgScore : plus d\'envies satisfaites = meilleur score', () => {
  const inp = { days:10, budget:1500 };
  const m = { match:1, fitTime:true, onSite:4, rideDays:5, fitBudget:true, total:1000, owKm:1000 };
  const m2 = Object.assign({}, m, { match:2 });
  assert.ok(cfg.cfgScore(m2, inp) > cfg.cfgScore(m, inp));
});

test('cfgScore : dépasser le budget ou le temps pénalise', () => {
  const inp = { days:10, budget:1500 };
  const ok = { match:1, fitTime:true, onSite:4, rideDays:5, fitBudget:true, total:1200, owKm:1000 };
  const overBudget = Object.assign({}, ok, { fitBudget:false, total:3000 });
  const overTime = Object.assign({}, ok, { fitTime:false, rideDays:16 });
  assert.ok(cfg.cfgScore(overBudget, inp) < cfg.cfgScore(ok, inp), 'budget dépassé < ok');
  assert.ok(cfg.cfgScore(overTime, inp) < cfg.cfgScore(ok, inp), 'temps dépassé < ok');
});

// Petite réplique locale de haversine (km) juste pour calculer l'attendu d'un test
function haversineKm(a, b){
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
