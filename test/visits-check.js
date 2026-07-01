// Valide le jeu de données VISIT_POI (lieux "À voir") extrait de index.html :
// structure complète, coordonnées plausibles (Europe), segments valides, types connus.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extrait le littéral du tableau const VISIT_POI = [ ... ]; (jusqu'au "];" indenté)
function extractArray(name){
  const start = html.indexOf(`const ${name} = [`);
  assert.ok(start !== -1, `${name} introuvable`);
  const open = html.indexOf('[', start);
  const close = html.indexOf('\n      ];', open);
  assert.ok(close !== -1, `fin de ${name} introuvable`);
  const literal = html.slice(open, close + 8).replace(/;\s*$/, '');
  return new Function(`return (${literal});`)();
}

const POI = extractArray('VISIT_POI');
const TYPES = new Set(['paysage', 'batiment', 'mixte']);

test('VISIT_POI — liste non vide et riche', () => {
  assert.ok(POI.length >= 20, `attendu >= 20 lieux, reçu ${POI.length}`);
});

test('VISIT_POI — chaque entrée est complète et valide', () => {
  for (const p of POI){
    assert.ok(p.id && typeof p.id === 'string', `id manquant: ${JSON.stringify(p)}`);
    assert.ok(p.name && p.desc, `name/desc manquant pour ${p.id}`);
    assert.ok(p.flag && p.emoji, `flag/emoji manquant pour ${p.id}`);
    assert.ok(TYPES.has(p.type), `type invalide pour ${p.id}: ${p.type}`);
    assert.ok(Number.isInteger(p.seg) && p.seg >= 0 && p.seg <= 5, `seg invalide pour ${p.id}: ${p.seg}`);
    assert.ok(typeof p.detour === 'number' && p.detour >= 0, `detour invalide pour ${p.id}`);
    assert.strictEqual(typeof p.unesco, 'boolean', `unesco doit être booléen pour ${p.id}`);
    // Coordonnées dans une boîte Europe (France → Estonie)
    assert.ok(p.lat >= 45 && p.lat <= 60, `lat hors zone pour ${p.id}: ${p.lat}`);
    assert.ok(p.lng >= 2 && p.lng <= 28, `lng hors zone pour ${p.id}: ${p.lng}`);
  }
});

test('VISIT_POI — identifiants uniques', () => {
  const ids = POI.map(p => p.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'doublon dans les id');
});

test('VISIT_POI — bon équilibre paysages / architecture', () => {
  const pay = POI.filter(p => p.type === 'paysage' || p.type === 'mixte').length;
  const bat = POI.filter(p => p.type === 'batiment' || p.type === 'mixte').length;
  assert.ok(pay >= 5, `pas assez de paysages: ${pay}`);
  assert.ok(bat >= 5, `pas assez d'architecture: ${bat}`);
});

test('VISIT_POI — chaque tronçon (0..5) a au moins un lieu', () => {
  for (let s = 0; s <= 5; s++){
    assert.ok(POI.some(p => p.seg === s), `aucun lieu pour le tronçon ${s}`);
  }
});

test('VISIT_POI — des lieux "sur la route" (detour 0) existent', () => {
  assert.ok(POI.filter(p => p.detour === 0).length >= 4, 'trop peu de lieux sans détour');
});
