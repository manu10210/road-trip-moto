// Smoke test temporaire : exécute le script inline d'index.html dans un DOM simulé
// et vérifie que heroSVG / sceneSVG produisent du SVG sans lever d'erreur.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const body = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).join('\n');

// Élément DOM factice : tout accès de propriété / appel de méthode est absorbé.
function fakeEl() {
  const el = {
    style: { setProperty() {} },
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, insertBefore() {},
    getAttribute() { return null; }, setAttribute() {}, removeAttribute() {}, querySelector() { return fakeEl(); },
    querySelectorAll() { return []; }, getContext() { return {}; },
    firstChild: null, value: '', checked: false, dataset: {}, offsetHeight: 52,
  };
  let _html = '';
  Object.defineProperty(el, 'innerHTML', { get() { return _html; }, set(v) { _html = String(v); } });
  return el;
}
const doc = {
  documentElement: fakeEl(),
  getElementById() { return fakeEl(); },
  querySelector() { return fakeEl(); },
  querySelectorAll() { return []; },
  createElement() { return fakeEl(); },
  addEventListener() {},
};
const sandbox = {
  console,
  document: doc,
  window: {},
  navigator: { serviceWorker: { controller: null, addEventListener() {}, register() { return Promise.resolve({ update() {} }); } } },
  history: { replaceState() {} },
  location: { hash: '' },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
  requestAnimationFrame() {}, fetch() { return Promise.resolve({ json: () => ({}) }); },
  addEventListener() {}, removeEventListener() {}, scrollTo() {},
  matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
  L: undefined,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

// Expose les générateurs pour les tester après évaluation.
const wrapped = body + '\n;globalThis.__T = { heroSVG, sceneSVG, _seed, poiTheme, TAB_HERO };';
vm.createContext(sandbox);
vm.runInContext(wrapped, sandbox, { filename: 'index-inline.js' });

const T = sandbox.__T;
const assert = require('node:assert');
const test = require('node:test');

test('heroSVG produit un SVG pour chaque thème', () => {
  for (const theme of ['depart', 'plains', 'fields', 'forest', 'mountain', 'coast', 'city']) {
    const out = T.heroSVG(theme, 200, T._seed(theme), true);
    assert.match(out, /^<svg[\s\S]*<\/svg>$/, `thème ${theme} doit produire un <svg>`);
    assert.ok(out.length > 200, `thème ${theme} doit être non trivial`);
  }
});

test('heroSVG couvre tous les onglets de TAB_HERO', () => {
  for (const [tab, cfg] of Object.entries(T.TAB_HERO)) {
    const out = T.heroSVG(cfg.theme, cfg.hue, T._seed(tab), !!cfg.road);
    assert.match(out, /<svg[\s\S]*<\/svg>/, `onglet ${tab}`);
    assert.ok(cfg.title && cfg.sub, `onglet ${tab} doit avoir titre + sous-titre`);
  }
});

test('sceneSVG produit un SVG (paysage + ville)', () => {
  for (const theme of ['coast', 'mountain', 'forest', 'city', 'plains']) {
    const out = T.sceneSVG(theme, 210, T._seed('x' + theme));
    assert.match(out, /^<svg class="scene"[\s\S]*<\/svg>$/);
  }
});

test('les IDs de dégradés sont uniques entre deux scènes', () => {
  const a = T.heroSVG('coast', 200, 1, false);
  const b = T.heroSVG('coast', 200, 1, false);
  const idA = (a.match(/id="(hr\d+)"/) || [])[1];
  const idB = (b.match(/id="(hr\d+)"/) || [])[1];
  assert.ok(idA && idB && idA !== idB, 'deux héros doivent avoir des IDs distincts');
});
