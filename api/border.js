/**
 * GET /api/border?countries=FR,IT,CH
 * Retourne les infos frontières (documents, équipements, vitesse, notes) pour les pays demandés.
 * Sans paramètre → retourne tous les pays disponibles.
 */

const { COUNTRIES, getCountry } = require("../lib/countries");

function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée (GET requis)" });
    return;
  }

  const raw = req.query?.countries || "";
  const requested = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (!requested.length) {
    // Lister tous les pays disponibles dans la lib
    const available = Object.keys(COUNTRIES).map((code) => ({
      code,
      name: COUNTRIES[code].name,
      flag: COUNTRIES[code].flag
    }));
    res.status(200).json({ ok: true, available, count: available.length });
    return;
  }

  const result = {};
  const missing = [];

  requested.forEach((code) => {
    const data = getCountry(code);
    result[code] = data;
    if (!COUNTRIES[code]) missing.push(code);
  });

  res.status(200).json({
    ok: true,
    countries: result,
    missing: missing.length ? missing : undefined
  });
}

module.exports = handler;
