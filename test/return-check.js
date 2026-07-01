// Teste la LOGIQUE du trajet retour (coût détaillé, dates clés) en extrayant le code réel
// de index.html. returnCost/returnDates lisent le DOM + localStorage : on injecte des faux.
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function one(re, label){ const m = html.match(re); assert.ok(m, 'introuvable : ' + (label || re)); return m[0]; }
function slice(a, b){ const i = html.indexOf(a); const j = html.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, 'slice ' + a); return html.slice(i, j); }

// Faux document + localStorage, pilotables depuis les tests
const DOC = { _v:{}, getElementById(id){ return (id in this._v) ? { value:this._v[id] } : null; } };
const LS  = { _s:{}, getItem(k){ return k in this._s ? this._s[k] : null; }, setItem(k,v){ this._s[k] = String(v); } };

const body = `
  ${one(/const _RET_MEALS_PER_DAY = \d+;/, '_RET_MEALS_PER_DAY')}
  ${one(/const _retNum = [^\n]+;/, '_retNum')}
  ${slice('function returnCost(route){', 'function returnDates(route){')}
  ${slice('function returnDates(route){', 'let _returnInit = false;')}
  ${one(/const RETURN_ROUTES = \[[\s\S]*?\n {6}\];/, 'RETURN_ROUTES')}
  return { RETURN_ROUTES, returnCost, returnDates };
`;
const ret = new Function('document', 'localStorage', body)(DOC, LS);
const route = id => { const r = ret.RETURN_ROUTES.find(x => x.id === id); assert.ok(r, 'route ' + id); return r; };
const near = (a, b, eps) => Math.abs(a - b) <= (eps == null ? 0.01 : eps);
const days = (a, b) => Math.round((b - a) / 86400000);

// ── Données de référence ───────────────────────────────────────────
test('RETURN_ROUTES : contient au moins les itinéraires direct/central/scandi', () => {
  ['direct', 'central', 'scandi'].forEach(id => assert.ok(route(id), id + ' présent'));
  ret.RETURN_ROUTES.forEach(r => {
    assert.ok(r.km > 0 && r.days > 0, r.id + ' km/days valides');
    assert.ok(Array.isArray(r.cities) && r.cities.length >= 2, r.id + ' a des villes');
  });
});

// ── returnCost : addition fuel + nuits + repas + péages + ferry ─────
test('returnCost : valeurs par défaut (5.8 L · 1,95 € · 55 €/nuit) sur le trajet direct', () => {
  DOC._v = {}; // aucun champ → defaults
  const r = route('direct'); // km:2300, days:5, ferry:0, tollEur:55
  const c = ret.returnCost(r);
  assert.ok(near(c.fuel, 2300 / 100 * 5.8 * 1.95, 0.5), 'carburant');
  assert.strictEqual(c.nights, 4);
  assert.strictEqual(c.lodging, 4 * 55);
  assert.strictEqual(c.meals, 5 * 35);
  assert.strictEqual(c.tolls, 55);
  assert.strictEqual(c.ferry, 0);
  assert.ok(near(c.total, c.fuel + c.lodging + c.meals + c.tolls + c.ferry, 0.001), 'total = somme des postes');
});

test('returnCost : prend en compte les champs moto saisis', () => {
  DOC._v = { 'f-conso':'6', 'f-price':'2', 'f-night':'80' };
  const r = route('direct');
  const c = ret.returnCost(r);
  assert.ok(near(c.fuel, 2300 / 100 * 6 * 2, 0.5), 'carburant recalculé');
  assert.strictEqual(c.lodging, 4 * 80, 'nuits à 80 €');
});

test('returnCost : le ferry du trajet scandinave est ajouté', () => {
  DOC._v = {};
  const r = route('scandi'); // ferry:230
  const c = ret.returnCost(r);
  assert.strictEqual(c.ferry, 230);
  assert.ok(c.total > ret.returnCost(route('direct')).total, 'plus cher que le direct');
});

// ── returnDates : enchaînement départ → arrivée → repart → maison ──
test('returnDates : null tant qu\'aucune date de départ n\'est fixée', () => {
  LS._s = {};
  assert.strictEqual(ret.returnDates(route('direct')), null);
});

test('returnDates : aller 6 j, séjour 4 j, retour selon route.days', () => {
  LS._s = { 'roadtrip_departure':'2026-07-01' };
  DOC._v = { 'ret-outbound':'6', 'ret-stay':'4' };
  const r = route('central'); // days:7
  const d = ret.returnDates(r);
  assert.strictEqual(days(d.start, d.arrival), 5, 'arrivée = départ + (aller-1)');
  assert.strictEqual(days(d.arrival, d.leave), 4, 'séjour de 4 jours');
  assert.strictEqual(days(d.leave, d.home), r.days - 1, 'retour = route.days - 1');
  assert.strictEqual(days(d.start, d.home), 5 + 4 + (r.days - 1), 'durée totale cohérente');
});

test('returnDates : un retour plus long repousse la date maison', () => {
  LS._s = { 'roadtrip_departure':'2026-07-01' };
  DOC._v = { 'ret-outbound':'6', 'ret-stay':'4' };
  const home = r => ret.returnDates(r).home.getTime();
  assert.ok(home(route('scandi')) > home(route('direct')), 'scandi (8 j) rentre après direct (5 j)');
});
