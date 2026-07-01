const test = require('node:test');
const assert = require('node:assert/strict');

const tripHandler   = require('../api/trip');
const borderHandler = require('../api/border');
const budgetHandler = require('../api/budget');

// ── /api/trip ─────────────────────────────────────────────────────────────────
test('buildTripPlan - métriques principales', () => {
  const plan = tripHandler.buildTripPlan({
    tripName: 'Test trip',
    totalDistanceKm: 1200,
    dailyKm: 300,
    countries: ['FR', 'IT'],
    bike: { tankLiters: 18, consumptionLPer100: 5, fuelPricePerLiter: 2, safetyReservePercent: 20 },
    lodgingPreferences: { budgetPerNight: 80 }
  });
  assert.equal(plan.summary.estimatedDays, 4);
  assert.equal(plan.summary.estimatedFuelLiters, 60);
  assert.equal(plan.summary.estimatedFuelBudget, 120);
  assert.equal(plan.hebergement.nights, 3);
  assert.equal(plan.hebergement.estimatedTotalBudget, 240);
  assert.equal(plan.borderChecklist.length, 2);
});

test('buildTripPlan - fuelPlan contient consumptionLPer100 et fuelPricePerLiter', () => {
  const plan = tripHandler.buildTripPlan({
    totalDistanceKm: 500,
    bike: { consumptionLPer100: 5.5, fuelPricePerLiter: 1.98, tankLiters: 16 }
  });
  assert.equal(plan.fuelPlan.consumptionLPer100, 5.5);
  assert.equal(plan.fuelPlan.fuelPricePerLiter, 1.98);
  assert.ok(plan.fuelPlan.fullTankRangeKm > 0);
});

test('buildTripPlan - borderChecklist contient tollInfo et emergencyNumbers', () => {
  const plan = tripHandler.buildTripPlan({ totalDistanceKm: 500, countries: ['FR', 'CH'] });
  const fr = plan.borderChecklist.find(c => c.countryCode === 'FR');
  assert.ok(fr, 'FR présent');
  assert.equal(fr.name, 'France');
  assert.equal(fr.flag, '🇫🇷');
  assert.ok(Array.isArray(fr.documents) && fr.documents.length > 0, 'documents présents');
  assert.ok(fr.tollInfo, 'tollInfo présent');
  assert.equal(fr.tollInfo.type, 'perKm');
  assert.ok(fr.emergencyNumbers, 'emergencyNumbers présent');
  assert.equal(fr.emergencyNumbers.police, '17');
  assert.equal(fr.emergencyNumbers.ambulance, '15');

  const ch = plan.borderChecklist.find(c => c.countryCode === 'CH');
  assert.equal(ch.currency, 'CHF');
  assert.equal(ch.tollInfo.type, 'vignette');
  assert.equal(ch.tollInfo.motorbikeVignettePrice, 40);
  assert.equal(ch.emergencyNumbers.police, '117');
});

test('buildTripPlan - budgetBreakdown inclus dans le plan', () => {
  const plan = tripHandler.buildTripPlan({
    totalDistanceKm: 1000, dailyKm: 200,
    countries: ['FR', 'IT'],
    bike: { consumptionLPer100: 5, fuelPricePerLiter: 2 },
    lodgingPreferences: { budgetPerNight: 70 }
  });
  const b = plan.budgetBreakdown;
  assert.ok(b, 'budgetBreakdown présent');
  assert.ok(b.totalEstimate > 0, 'total > 0');
  assert.ok(b.perDay > 0, 'perDay > 0');
  assert.ok(b.breakdown.fuel, 'breakdown.fuel présent');
  assert.ok(b.breakdown.tolls, 'breakdown.tolls présent');
  assert.ok(b.breakdown.lodging, 'breakdown.lodging présent');
  assert.ok(Array.isArray(b.tollsByCountry), 'tollsByCountry tableau');
  assert.ok(Array.isArray(b.tips) && b.tips.length > 0, 'tips non vide');
});

test('buildTripPlan - pays inconnu → fallback', () => {
  const plan = tripHandler.buildTripPlan({ totalDistanceKm: 200, countries: ['XX'] });
  const xx = plan.borderChecklist.find(c => c.countryCode === 'XX');
  assert.ok(xx, 'XX retourné');
  assert.ok(Array.isArray(xx.documents) && xx.documents.length > 0);
  assert.ok(xx.emergencyNumbers, 'emergencyNumbers de fallback présent');
  assert.equal(xx.emergencyNumbers.police, '112');
});

test('buildTripPlan - packingEssentials présent', () => {
  const plan = tripHandler.buildTripPlan({ totalDistanceKm: 300 });
  assert.ok(Array.isArray(plan.rideChecklists.packingEssentials) && plan.rideChecklists.packingEssentials.length > 0);
});

test('handler trip - 405', () => {
  const req = { method: 'PUT' };
  let statusCode, body;
  const res = { status(c){ statusCode=c; return this; }, json(p){ body=p; } };
  tripHandler(req, res);
  assert.equal(statusCode, 405);
  assert.equal(body.ok, false);
});

test('handler trip - GET retourne example', () => {
  const req = { method: 'GET' };
  let statusCode, body;
  const res = { status(c){ statusCode=c; return this; }, json(p){ body=p; } };
  tripHandler(req, res);
  assert.equal(statusCode, 200);
  assert.ok(body.example);
});

// ── /api/border ───────────────────────────────────────────────────────────────
test('handler border - liste tous les pays sans paramètre', () => {
  const req = { method: 'GET', query: {} };
  let statusCode, body;
  const res = { status(c){ statusCode=c; return this; }, json(p){ body=p; } };
  borderHandler(req, res);
  assert.equal(statusCode, 200);
  assert.ok(body.available.length >= 10);
});

test('handler border - pays connus avec tollInfo et emergencyNumbers', () => {
  const req = { method: 'GET', query: { countries: 'FR,CH,DE,PL,EE' } };
  let statusCode, body;
  const res = { status(c){ statusCode=c; return this; }, json(p){ body=p; } };
  borderHandler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(body.countries.FR.name, 'France');
  assert.equal(body.countries.CH.currency, 'CHF');
  assert.equal(body.countries.DE.tollInfo.type, 'free');
  assert.equal(body.countries.FR.emergencyNumbers.police, '17');
  // Nouveaux pays baltiques
  assert.equal(body.countries.PL.name, 'Pologne');
  assert.equal(body.countries.PL.emergencyNumbers.police, '997');
  assert.equal(body.countries.PL.emergencyNumbers.ambulance, '999');
  assert.equal(body.countries.PL.tollInfo.type, 'perKm');
  assert.equal(body.countries.EE.name, 'Estonie');
  assert.equal(body.countries.EE.tollInfo.type, 'free');
  assert.equal(body.countries.EE.emergencyNumbers.police, '110');
});

test('handler border - pays inconnu dans missing', () => {
  const req = { method: 'GET', query: { countries: 'FR,ZZ' } };
  let body;
  const res = { status(){ return this; }, json(p){ body=p; } };
  borderHandler(req, res);
  assert.ok(body.missing.includes('ZZ'));
});

test('handler border - 405 sur POST', () => {
  const req = { method: 'POST' };
  let statusCode;
  const res = { status(c){ statusCode=c; return this; }, json(){} };
  borderHandler(req, res);
  assert.equal(statusCode, 405);
});

// ── /api/budget ───────────────────────────────────────────────────────────────
test('buildBudget - calcul complet', () => {
  const budget = budgetHandler.buildBudget({
    totalDistanceKm: 1200,
    days: 5, nights: 4,
    countries: ['FR', 'IT', 'CH'],
    bike: { consumptionLPer100: 5 },
    defaultFuelPricePerLiter: 2,
    lodgingPerNight: 80,
    mealsPerDay: 35,
    miscPerDay: 20
  });
  assert.ok(budget.totalEstimate > 0);
  assert.ok(budget.perDay > 0);
  assert.ok(budget.breakdown.fuel.total > 0);
  assert.equal(budget.breakdown.meals.total, 5 * 35);
  assert.equal(budget.breakdown.misc.total, 5 * 20);
  assert.equal(budget.breakdown.lodging.total, 4 * 80);
  assert.ok(budget.breakdown.tolls.total > 0, 'péages > 0 (FR + IT payants)');
  assert.ok(Array.isArray(budget.tollsByCountry));
  assert.equal(budget.tollsByCountry.length, 3);
});

test('buildBudget - pays gratuits → tolls = 0 pour DE', () => {
  const budget = budgetHandler.buildBudget({
    totalDistanceKm: 500, days: 2, nights: 1,
    countries: ['DE'],
    bike: { consumptionLPer100: 5 },
    defaultFuelPricePerLiter: 1.9
  });
  const de = budget.tollsByCountry.find(t => t.code === 'DE');
  assert.ok(de, 'DE présent');
  assert.equal(de.estimatedCost, 0);
  assert.equal(de.tollType, 'free');
});

test('buildBudget - vignette CH → coût fixe', () => {
  const budget = budgetHandler.buildBudget({
    totalDistanceKm: 300, days: 2, nights: 1,
    countries: ['CH'],
    bike: { consumptionLPer100: 5 },
    defaultFuelPricePerLiter: 1.9
  });
  const ch = budget.tollsByCountry.find(t => t.code === 'CH');
  assert.ok(ch, 'CH présent');
  assert.equal(ch.estimatedCost, 40); // vignette 40 CHF
  assert.equal(ch.tollType, 'vignette');
});

test('buildBudget - route Estonie (FR→BE→DE→PL→LT→LV→EE) = péages gratuits pour EE/LV', () => {
  const budget = budgetHandler.buildBudget({
    totalDistanceKm: 4400, days: 14, nights: 13,
    countries: ['FR', 'BE', 'DE', 'PL', 'LT', 'LV', 'EE'],
    bike: { consumptionLPer100: 5.2 },
    defaultFuelPricePerLiter: 1.75,
    lodgingPerNight: 55,
    mealsPerDay: 30,
    miscPerDay: 20
  });
  assert.ok(budget.totalEstimate > 1000, 'Budget global > 1000 €');
  const ee = budget.tollsByCountry.find(t => t.code === 'EE');
  const lv = budget.tollsByCountry.find(t => t.code === 'LV');
  const de = budget.tollsByCountry.find(t => t.code === 'DE');
  assert.equal(ee.estimatedCost, 0, 'Estonie : aucun péage');
  assert.equal(lv.estimatedCost, 0, 'Lettonie : aucun péage');
  assert.equal(de.estimatedCost, 0, 'Allemagne : aucun péage');
  assert.ok(budget.tollsByCountry.find(t => t.code === 'PL').estimatedCost > 0, 'Pologne : péages payants');
  assert.ok(Array.isArray(budget.tips) && budget.tips.length > 0);
});

test('handler budget - GET retourne example', () => {
  const req = { method: 'GET' };
  let statusCode, body;
  const res = { status(c){ statusCode=c; return this; }, json(p){ body=p; } };
  budgetHandler(req, res);
  assert.equal(statusCode, 200);
  assert.ok(body.example);
});

test('handler budget - 405', () => {
  const req = { method: 'DELETE' };
  let statusCode;
  const res = { status(c){ statusCode=c; return this; }, json(){} };
  budgetHandler(req, res);
  assert.equal(statusCode, 405);
});


// ── /api/trip ────────────────────────────────────────────────────────────────
test('buildTripPlan - métriques principales', () => {
  const plan = tripHandler.buildTripPlan({
    tripName: 'Test trip',
    totalDistanceKm: 1200,
    dailyKm: 300,
    countries: ['FR', 'IT'],
    bike: {
      tankLiters: 18,
      consumptionLPer100: 5,
      fuelPricePerLiter: 2,
      safetyReservePercent: 20
    },
    lodgingPreferences: { budgetPerNight: 80 }
  });

  assert.equal(plan.summary.estimatedDays, 4);
  assert.equal(plan.summary.estimatedFuelLiters, 60);
  assert.equal(plan.summary.estimatedFuelBudget, 120);
  assert.equal(plan.hebergement.nights, 3);
  assert.equal(plan.hebergement.estimatedTotalBudget, 240);
  assert.equal(plan.borderChecklist.length, 2);
});

test('buildTripPlan - borderChecklist enrichi avec données pays', () => {
  const plan = tripHandler.buildTripPlan({
    totalDistanceKm: 500,
    countries: ['FR', 'CH']
  });

  const fr = plan.borderChecklist.find(c => c.countryCode === 'FR');
  assert.ok(fr, 'FR doit être dans le borderChecklist');
  assert.equal(fr.name, 'France');
  assert.equal(fr.flag, '🇫🇷');
  assert.ok(Array.isArray(fr.documents), 'documents doit être un tableau');
  assert.ok(fr.documents.length > 0, 'documents ne doit pas être vide');
  assert.ok(fr.speedLimits, 'speedLimits doit exister');
  assert.ok(fr.speedLimits.highway, 'speedLimits.highway doit exister');

  const ch = plan.borderChecklist.find(c => c.countryCode === 'CH');
  assert.equal(ch.currency, 'CHF');
});

test('buildTripPlan - packingEssentials dans rideChecklists', () => {
  const plan = tripHandler.buildTripPlan({ totalDistanceKm: 300 });
  assert.ok(Array.isArray(plan.rideChecklists.packingEssentials), 'packingEssentials doit être un tableau');
  assert.ok(plan.rideChecklists.packingEssentials.length > 0);
  assert.ok(Array.isArray(plan.rideChecklists.dailyRoutine));
  assert.ok(Array.isArray(plan.rideChecklists.beforeDeparture));
});

test('buildTripPlan - pays inconnu → données de fallback', () => {
  const plan = tripHandler.buildTripPlan({
    totalDistanceKm: 200,
    countries: ['XX']
  });
  const xx = plan.borderChecklist.find(c => c.countryCode === 'XX');
  assert.ok(xx, 'XX doit être retourné avec un fallback');
  assert.ok(Array.isArray(xx.documents));
  assert.ok(xx.documents.length > 0);
});

test('handler trip - 405 sur méthode non autorisée', () => {
  const req = { method: 'PUT' };
  let statusCode, body;
  const res = {
    status(c) { statusCode = c; return this; },
    json(p) { body = p; }
  };
  tripHandler(req, res);
  assert.equal(statusCode, 405);
  assert.equal(body.ok, false);
});

test('handler trip - GET retourne exemple', () => {
  const req = { method: 'GET' };
  let statusCode, body;
  const res = {
    status(c) { statusCode = c; return this; },
    json(p) { body = p; }
  };
  tripHandler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(body.ok, true);
  assert.ok(body.example, 'GET doit retourner un exemple');
});

// ── /api/border ───────────────────────────────────────────────────────────────
test('handler border - GET sans paramètre retourne tous les pays disponibles', () => {
  const req = { method: 'GET', query: {} };
  let statusCode, body;
  const res = {
    status(c) { statusCode = c; return this; },
    json(p) { body = p; }
  };
  borderHandler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(body.ok, true);
  assert.ok(body.available.length > 5, 'Au moins 5 pays disponibles');
});

test('handler border - GET avec pays connus', () => {
  const req = { method: 'GET', query: { countries: 'FR,IT,CH' } };
  let statusCode, body;
  const res = {
    status(c) { statusCode = c; return this; },
    json(p) { body = p; }
  };
  borderHandler(req, res);
  assert.equal(statusCode, 200);
  assert.ok(body.countries.FR);
  assert.ok(body.countries.IT);
  assert.ok(body.countries.CH);
  assert.equal(body.countries.FR.name, 'France');
  assert.equal(body.countries.CH.currency, 'CHF');
});

test('handler border - pays inconnu retourné dans missing', () => {
  const req = { method: 'GET', query: { countries: 'FR,ZZ' } };
  let body;
  const res = {
    status() { return this; },
    json(p) { body = p; }
  };
  borderHandler(req, res);
  assert.ok(body.missing.includes('ZZ'));
  assert.ok(body.countries.ZZ, 'Fallback retourné pour ZZ');
});

test('handler border - 405 sur méthode POST', () => {
  const req = { method: 'POST' };
  let statusCode, body;
  const res = {
    status(c) { statusCode = c; return this; },
    json(p) { body = p; }
  };
  borderHandler(req, res);
  assert.equal(statusCode, 405);
  assert.equal(body.ok, false);
});

