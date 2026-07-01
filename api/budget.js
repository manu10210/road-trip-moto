/**
 * POST /api/budget
 * Calcule un budget de voyage complet : essence, péages, hébergement, repas, divers.
 * Peut être appelé indépendamment de /api/trip.
 */

const { getCountry, TOLL_INFO } = require("../lib/countries");

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildBudget(payload = {}) {
  const totalDistanceKm = Math.max(0, toNumber(payload.totalDistanceKm, 0));
  const days             = Math.max(1, toNumber(payload.days, 1));
  const nights           = Math.max(0, toNumber(payload.nights, days - 1));

  const countries        = Array.isArray(payload.countries)
    ? [...new Set(payload.countries.map((c) => String(c).trim().toUpperCase()).filter(Boolean))]
    : [];

  const bike                  = payload.bike || {};
  const consumptionLPer100    = Math.max(2,   toNumber(bike.consumptionLPer100, 5));
  const defaultFuelPrice      = Math.max(0.5, toNumber(payload.defaultFuelPricePerLiter, 1.9));
  const fuelPricesByCountry   = payload.fuelPricesByCountry || {};
  const lodgingPerNight       = Math.max(0,   toNumber(payload.lodgingPerNight, 65));
  const mealsPerDay           = Math.max(0,   toNumber(payload.mealsPerDay, 35));
  const miscPerDay            = Math.max(0,   toNumber(payload.miscPerDay, 20));

  // ── Carburant ──────────────────────────────────────────────────
  const totalFuelLiters = (totalDistanceKm * consumptionLPer100) / 100;
  let fuelTotal = 0;

  if (countries.length > 0 && totalFuelLiters > 0) {
    const kmPerCountry = totalDistanceKm / countries.length;
    countries.forEach((code) => {
      const price = toNumber(fuelPricesByCountry[code], defaultFuelPrice);
      fuelTotal += (kmPerCountry * consumptionLPer100 / 100) * price;
    });
  } else {
    fuelTotal = totalFuelLiters * defaultFuelPrice;
  }
  fuelTotal = Number(fuelTotal.toFixed(2));

  // ── Péages ─────────────────────────────────────────────────────
  const kmPerCountry = countries.length > 0 ? totalDistanceKm / countries.length : totalDistanceKm;

  const tollsByCountry = countries.map((code) => {
    const country = getCountry(code);
    const toll    = country.tollInfo || {};
    let cost = 0;

    if (toll.type === "perKm")          cost = kmPerCountry * (toll.estimatedRatePerKm || 0);
    else if (toll.type === "vignette")  cost = Number(toll.motorbikeVignettePrice || 0);
    else if (toll.type === "vignette+perKm") {
      cost = Number(toll.motorbikeVignettePrice || 0) + kmPerCountry * (toll.estimatedRatePerKm || 0);
    }

    return {
      code,
      name:          country.name,
      flag:          country.flag,
      tollType:      toll.type || "unknown",
      estimatedCost: Number(cost.toFixed(2)),
      note:          toll.note || "—",
      vignettePrice: toll.motorbikeVignettePrice || null,
      currency:      toll.currency || "EUR"
    };
  });

  const tollsTotal   = Number(tollsByCountry.reduce((s, t) => s + t.estimatedCost, 0).toFixed(2));
  const lodgingTotal = Number((nights * lodgingPerNight).toFixed(2));
  const mealsTotal   = Number((days * mealsPerDay).toFixed(2));
  const miscTotal    = Number((days * miscPerDay).toFixed(2));
  const grandTotal   = Number((fuelTotal + tollsTotal + lodgingTotal + mealsTotal + miscTotal).toFixed(2));
  const perDay       = Number((grandTotal / Math.max(1, days)).toFixed(2));

  const tips = [
    grandTotal > 2500 ? "Budget > 2500 € : prévoir une carte CB internationale pour les péages automatiques" : null,
    fuelTotal  > 200  ? "Faire le plein en Andorre (AD) ou au Luxembourg (LU) si la route le permet — carburant 20–30% moins cher" : null,
    tollsTotal > 100  ? "Péages importants : activer 'éviter les péages' sur le GPS pour certaines sections" : null,
    countries.some((c) => c === "CH") ? "Suisse : acheter la vignette annuelle (40 CHF) dès l'entrée — obligatoire pour toutes les autoroutes" : null,
    countries.some((c) => c === "AT") ? "Autriche : vignette 10 jours (~14 €) + tunnels alpins payants séparément" : null,
    "Prévoir +15 % de marge pour les imprévus (crevaison, nuit imprévue, frais médicaux légers)",
    "Toujours avoir ~200 € en espèces pour les stations isolées et petits hébergements"
  ].filter(Boolean);

  return {
    totalEstimate: grandTotal,
    perDay,
    nights,
    days,
    breakdown: {
      fuel:    { total: fuelTotal,    perDay: Number((fuelTotal    / days).toFixed(2)), label: "⛽ Essence",         color: "#f59e0b" },
      tolls:   { total: tollsTotal,   perDay: Number((tollsTotal   / days).toFixed(2)), label: "🛣️ Péages",          color: "#f97316" },
      lodging: { total: lodgingTotal, perDay: Number((lodgingTotal / days).toFixed(2)), label: "🏨 Hébergement",     color: "#a78bfa" },
      meals:   { total: mealsTotal,   perDay: mealsPerDay,                              label: "🍽️ Repas",           color: "#22c55e" },
      misc:    { total: miscTotal,    perDay: miscPerDay,                               label: "🛒 Divers",          color: "#94a3b8" }
    },
    tollsByCountry,
    tips
  };
}

function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      message: "POST /api/budget pour un calcul de budget complet.",
      example: {
        totalDistanceKm: 1800,
        days: 7,
        countries: ["FR", "IT", "CH"],
        bike: { consumptionLPer100: 5.2 },
        defaultFuelPricePerLiter: 1.95,
        lodgingPerNight: 70,
        mealsPerDay: 35,
        miscPerDay: 20
      }
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée (GET ou POST requis)" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  try {
    const budget = buildBudget(body || {});
    res.status(200).json({ ok: true, budget });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

module.exports = handler;
module.exports.buildBudget = buildBudget;
