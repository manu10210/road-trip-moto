const { getCountry } = require("../lib/countries");

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildTripPlan(payload = {}) {
  const tripName = String(payload.tripName || "Road trip moto").trim();

  const totalDistanceKm = Math.max(0, toNumber(payload.totalDistanceKm, 0));
  const dailyKm = Math.max(50, toNumber(payload.dailyKm, 250));

  const bike = payload.bike || {};
  const tankLiters = Math.max(5, toNumber(bike.tankLiters, 18));
  const consumptionLPer100 = Math.max(2, toNumber(bike.consumptionLPer100, 5));
  const fuelPricePerLiter = Math.max(0.5, toNumber(bike.fuelPricePerLiter, 1.9));
  const safetyReservePercent = clamp(toNumber(bike.safetyReservePercent, 20), 5, 40);

  const route = Array.isArray(payload.route) ? payload.route : [];
  const routeCountryCodes = route
    .map((segment) => String(segment.countryCode || "").trim().toUpperCase())
    .filter(Boolean);

  const countries = payload.countries && Array.isArray(payload.countries)
    ? payload.countries.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
    : routeCountryCodes;

  const uniqueCountries = [...new Set(countries)];

  const days = Math.max(1, Math.ceil(totalDistanceKm / dailyKm));
  // Moyenne réelle km/jour cohérente avec totalDistanceKm et estimatedDays
  // (dailyKm est la cible saisie par l'utilisateur, utilisée pour arrondir "days" au jour supérieur ;
  // on réaffiche donc la vraie moyenne résultante pour éviter une incohérence type "4400 km / 17 j ≠ 260 km/j").
  const averageDailyKm = totalDistanceKm > 0 ? Math.round(totalDistanceKm / days) : dailyKm;
  const estimatedFuelLiters = Number(((totalDistanceKm * consumptionLPer100) / 100).toFixed(1));
  const fuelBudget = Number((estimatedFuelLiters * fuelPricePerLiter).toFixed(2));

  const reserveLiters = Number(((tankLiters * safetyReservePercent) / 100).toFixed(1));
  const usableTankLiters = Number((tankLiters - reserveLiters).toFixed(1));
  const fullTankRangeKm = Math.max(40, Number(((usableTankLiters / consumptionLPer100) * 100).toFixed(0)));

  const recommendedStopsCount = Math.max(1, Math.ceil(totalDistanceKm / fullTankRangeKm));
  const refuelEveryKm = Math.max(80, Math.floor(fullTankRangeKm * 0.8));

  const borderChecklist = uniqueCountries.map((code) => {
    const country = getCountry(code);
    return {
      countryCode:      code,
      name:             country.name,
      flag:             country.flag,
      currency:         country.currency,
      documents:        country.documents,
      equipment:        country.equipment,
      speedLimits:      country.speedLimits,
      notes:            country.notes,
      fuelPriceEstimate:country.fuelPriceEstimate,
      fuelTypes:        country.fuelTypes,
      tollInfo:         country.tollInfo,
      emergencyNumbers: country.emergencyNumbers
    };
  });

  const averageNightBudget = toNumber(payload.lodgingPreferences?.budgetPerNight, 65);
  const nights = Math.max(1, days - 1);

  const hebergement = {
    nights,
    estimatedTotalBudget: Number((nights * averageNightBudget).toFixed(2)),
    filters: [
      "Parking sécurisé moto",
      "Arrivée tardive possible",
      "Espace séchage équipement",
      "Avis positifs motards"
    ],
    searchQueries: [
      "hotel biker friendly parking moto",
      "chambre d'hotes motards",
      "camping moto secure parking",
      "garage moto overnight"
    ],
    addressBookTemplate: [
      {
        type: "Hébergement",
        name: "Nom du lieu",
        address: "Adresse complète",
        phone: "+33...",
        notes: "Parking couvert ? Heure check-in ?"
      },
      {
        type: "Garage / Atelier",
        name: "Nom atelier",
        address: "Adresse complète",
        phone: "+33...",
        notes: "Réparation rapide / pneus"
      }
    ]
  };

  // ── Budget breakdown ──────────────────────────────────────────
  const kmPerCountry = uniqueCountries.length > 0 ? totalDistanceKm / uniqueCountries.length : totalDistanceKm;
  const tollsByCountry = uniqueCountries.map((code) => {
    const country = getCountry(code);
    const toll    = country.tollInfo || {};
    let cost = 0;
    if (toll.type === "perKm")               cost = kmPerCountry * (toll.estimatedRatePerKm || 0);
    else if (toll.type === "vignette")       cost = Number(toll.motorbikeVignettePrice || 0);
    else if (toll.type === "vignette+perKm") cost = Number(toll.motorbikeVignettePrice || 0) + kmPerCountry * (toll.estimatedRatePerKm || 0);
    return { code, name: country.name, flag: country.flag, tollType: toll.type || "unknown", estimatedCost: Number(cost.toFixed(2)), note: toll.note || "—" };
  });
  const tollsTotal   = tollsByCountry.reduce((s, t) => s + t.estimatedCost, 0);
  const lodgingTotal = nights * averageNightBudget;
  const mealsTotal   = days * 35;
  const miscTotal    = days * 20;
  const grandTotal   = fuelBudget + tollsTotal + lodgingTotal + mealsTotal + miscTotal;

  const budgetBreakdown = {
    totalEstimate: Number(grandTotal.toFixed(2)),
    perDay:        Number((grandTotal / Math.max(1, days)).toFixed(2)),
    breakdown: {
      fuel:    { total: fuelBudget,                      label: "⛽ Essence",     color: "#f59e0b" },
      tolls:   { total: Number(tollsTotal.toFixed(2)),   label: "🛣️ Péages",      color: "#f97316" },
      lodging: { total: Number(lodgingTotal.toFixed(2)), label: "🏨 Hébergement", color: "#a78bfa" },
      meals:   { total: Number(mealsTotal.toFixed(2)),   label: "🍽️ Repas",       color: "#22c55e" },
      misc:    { total: Number(miscTotal.toFixed(2)),    label: "🛒 Divers",      color: "#94a3b8" }
    },
    tollsByCountry,
    tips: [
      grandTotal > 2500 ? "Budget > 2500 € : prévoir CB internationale pour les péages" : null,
      fuelBudget > 200  ? "Faire le plein en Andorre (AD) ou Luxembourg (LU) si ta route le permet" : null,
      tollsTotal > 100  ? "Péages importants : GPS paramétrable pour éviter les autoroutes payantes" : null,
      "Prévoir +15 % de marge pour les imprévus",
      "Avoir ~200 € en espèces pour les stations isolées"
    ].filter(Boolean)
  };

  return {
    tripName,
    generatedAt: new Date().toISOString(),
    summary: {
      totalDistanceKm,
      dailyKm: averageDailyKm,
      targetDailyKm: dailyKm,
      estimatedDays: days,
      estimatedFuelLiters,
      estimatedFuelBudget: fuelBudget
    },
    fuelPlan: {
      tankLiters,
      consumptionLPer100,
      fuelPricePerLiter,
      safetyReservePercent,
      reserveLiters,
      usableTankLiters,
      fullTankRangeKm,
      refuelEveryKm,
      recommendedStopsCount
    },
    borderChecklist,
    hebergement,
    budgetBreakdown,
    rideChecklists: {
      beforeDeparture: [
        "Pneus : pression + état (usure, craquelures flancs)",
        "Freins avant et arrière",
        "Niveaux huile, liquide refroidissement, liquide de frein",
        "Éclairages : phare, feux stop, clignotants",
        "Chaîne : tension + graissage",
        "Kit pluie + trousse premiers secours",
        "Papiers en double (papier + photo sur téléphone)",
        "Assurance + contrat assistance dans le téléphone",
        "Cartes GPS hors-ligne téléchargées",
        "Batterie de secours + câble USB chargeur"
      ],
      dailyRoutine: [
        "Contrôle visuel rapide moto le matin (5 min)",
        "Vérifier pression pneus à froid",
        "Pause toutes les 1h30–2h max (fatigue + déshydratation)",
        "Plein anticipé avant zones isolées ou montagnardes",
        "Sauvegarder l'itinéraire du jour hors-ligne",
        "Vérifier météo du jour (vents, orage, chaleur > 35°C)"
      ],
      packingEssentials: [
        "Casque full-face ou modulable",
        "Blouson avec protections CE niveau 2",
        "Pantalon moto (protections genou/hanche)",
        "Gants été + gants pluie",
        "Surpantalon + sur-veste pluie",
        "Bottes ou chaussures avec protection cheville",
        "Gilet réfléchissant haute visibilité",
        "Antivol : cadenas U + câble secondaire",
        "Sandow / filet élastique pour sacoches",
        "Multiprise + adaptateurs selon pays traversés"
      ]
    },
    emergencyContacts: [
      { label: "Urgences Europe", value: "112" },
      { label: "Assistance assurance", value: "À renseigner" },
      { label: "Personne à contacter", value: "À renseigner" }
    ]
  };
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      throw new Error("JSON invalide");
    }
  }
  return {};
}

function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      message: "API road trip moto active. Envoie un POST JSON sur /api/trip.",
      example: {
        tripName: "Été Alpes + Italie",
        totalDistanceKm: 1800,
        dailyKm: 280,
        countries: ["FR", "IT", "CH"],
        bike: {
          tankLiters: 17,
          consumptionLPer100: 5.2,
          fuelPricePerLiter: 1.95,
          safetyReservePercent: 20
        },
        lodgingPreferences: {
          budgetPerNight: 70
        }
      }
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée" });
    return;
  }

  try {
    const body = parseBody(req);
    const plan = buildTripPlan(body);
    res.status(200).json({ ok: true, plan });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "Requête invalide" });
  }
}

module.exports = handler;
module.exports.buildTripPlan = buildTripPlan;
