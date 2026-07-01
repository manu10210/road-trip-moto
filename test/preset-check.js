// Valide la base d'itinéraires 5 jours CFG_PRESETS extraite d'index.html :
// schéma complet, coordonnées plausibles en Europe, ids uniques, zones couvertes.
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractArray(name){
  const m = html.match(new RegExp('const ' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);'));
  assert.ok(m, name + ' introuvable dans index.html');
  return Function('"use strict"; return (' + m[1] + ');')();
}

const CFG_PRESETS = extractArray('CFG_PRESETS');
const ZONES = ['fr', 'ouest', 'sud', 'est', 'nord'];

test('CFG_PRESETS — liste riche (≥ 12 itinéraires)', () => {
  assert.ok(Array.isArray(CFG_PRESETS), 'CFG_PRESETS est un tableau');
  assert.ok(CFG_PRESETS.length >= 12, 'au moins 12 itinéraires, trouvé ' + CFG_PRESETS.length);
});

test('CFG_PRESETS — chaque itinéraire a un schéma complet', () => {
  CFG_PRESETS.forEach(p => {
    assert.ok(p.id && typeof p.id === 'string', 'id manquant');
    assert.ok(p.title && typeof p.title === 'string', p.id + ' : title manquant');
    assert.ok(p.emoji && typeof p.emoji === 'string', p.id + ' : emoji manquant');
    assert.ok(ZONES.includes(p.zone), p.id + ' : zone invalide (' + p.zone + ')');
    assert.ok(typeof p.scene === 'string' && p.scene, p.id + ' : scene manquante');
    assert.ok(Number.isFinite(p.hue), p.id + ' : hue invalide');
    assert.ok(Array.isArray(p.themes) && p.themes.length >= 1, p.id + ' : themes manquants');
    assert.ok(p.blurb && p.blurb.length >= 15, p.id + ' : blurb trop court');
    assert.ok(Array.isArray(p.cities) && p.cities.length >= 3, p.id + ' : au moins 3 étapes');
  });
});

test('CFG_PRESETS — coordonnées plausibles en Europe', () => {
  CFG_PRESETS.forEach(p => {
    p.cities.forEach(c => {
      assert.ok(c.name && typeof c.name === 'string', p.id + ' : nom de ville manquant');
      assert.ok(/^[a-z]{2}$/i.test(c.cc || ''), p.id + ' : code pays invalide (' + c.cc + ')');
      assert.ok(Number.isFinite(c.lat) && c.lat >= 35 && c.lat <= 63, p.id + '/' + c.name + ' : lat hors Europe (' + c.lat + ')');
      assert.ok(Number.isFinite(c.lng) && c.lng >= -8 && c.lng <= 27, p.id + '/' + c.name + ' : lng hors Europe (' + c.lng + ')');
    });
  });
});

test('CFG_PRESETS — identifiants uniques', () => {
  const ids = CFG_PRESETS.map(p => p.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'ids dupliqués : ' + ids.join(', '));
});

test('CFG_PRESETS — toutes les zones d\'Europe sont couvertes', () => {
  ZONES.forEach(z => {
    assert.ok(CFG_PRESETS.some(p => p.zone === z), 'aucun itinéraire pour la zone ' + z);
  });
});

test('CFG_PRESETS — chaque ville en boucle revient près du départ', () => {
  const haversine = (a, b) => {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
    const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*toR)*Math.cos(b.lat*toR)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  CFG_PRESETS.filter(p => p.loop).forEach(p => {
    const start = p.cities[0], end = p.cities[p.cities.length - 1];
    // Une boucle cohérente : la dernière étape n'est pas absurdement loin du départ.
    assert.ok(haversine(start, end) < 600, p.id + ' : boucle trop ouverte (' + Math.round(haversine(start, end)) + ' km)');
  });
});
