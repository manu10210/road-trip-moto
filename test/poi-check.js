// Teste la LOGIQUE d'itinéraire « À voir » (ordre des étapes Google Maps, somme des détours),
// en extrayant VISIT_POI + ROUTE_WP depuis index.html. La validation du schéma des données
// est couverte par visits-check.js — ici on se concentre sur le comportement.
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

const VISIT_POI = extractArray('VISIT_POI');
const ROUTE_WP = extractArray('ROUTE_WP');

// Réplique de poiGmapsUrl() de index.html
function poiGmapsUrl(chosen){
  const pts = ROUTE_WP.map((w,i) => ({ lat:w.lat, lng:w.lng, order:i }))
    .concat(chosen.map(p => ({ lat:p.lat, lng:p.lng, order:p.seg + 0.5 })))
    .sort((a,b) => a.order - b.order);
  return 'https://www.google.com/maps/dir/' + pts.map(p => `${p.lat},${p.lng}`).join('/');
}

test('Itinéraire : départ Troyes et arrivée Tallinn préservés avec détours', () => {
  const chosen = VISIT_POI.filter(p => ['trakai','rundale','bruges'].includes(p.id));
  const url = poiGmapsUrl(chosen);
  const first = ROUTE_WP[0], last = ROUTE_WP[ROUTE_WP.length - 1];
  assert.ok(url.startsWith(`https://www.google.com/maps/dir/${first.lat},${first.lng}/`), 'départ = Troyes');
  assert.ok(url.endsWith(`${last.lat},${last.lng}`), 'arrivée = Tallinn');
  assert.strictEqual(url.split('/dir/')[1].split('/').length, ROUTE_WP.length + chosen.length, 'points = étapes + détours');
});

test('Itinéraire : un lieu du tronçon s s\'insère entre les villes s et s+1', () => {
  const crosses = VISIT_POI.find(p => p.id === 'crosses'); // seg 4 → entre Vilnius (idx 4) et Riga (idx 5)
  const pts = poiGmapsUrl([crosses]).split('/dir/')[1].split('/');
  const idxPoi = pts.indexOf(`${crosses.lat},${crosses.lng}`);
  const idxVilnius = pts.indexOf(`${ROUTE_WP[4].lat},${ROUTE_WP[4].lng}`);
  const idxRiga = pts.indexOf(`${ROUTE_WP[5].lat},${ROUTE_WP[5].lng}`);
  assert.ok(idxVilnius < idxPoi && idxPoi < idxRiga, 'Colline des Croix entre Vilnius et Riga');
});

test('Stats : somme des détours = somme des km des lieux choisis', () => {
  const chosen = VISIT_POI.filter(p => ['bruges','trakai','tallinnold'].includes(p.id));
  const km = chosen.reduce((s,p) => s + (p.detour||0), 0);
  const expected = VISIT_POI.find(p=>p.id==='bruges').detour + VISIT_POI.find(p=>p.id==='trakai').detour; // tallinnold = 0
  assert.strictEqual(km, expected);
});

test('Sélection vide → itinéraire = uniquement les 7 villes étapes', () => {
  assert.strictEqual(poiGmapsUrl([]).split('/dir/')[1].split('/').length, ROUTE_WP.length);
});

