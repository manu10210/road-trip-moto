// Teste les helpers PURS de l'espace famille (sécurité PIN, échappement HTML,
// détection YouTube, résolution de la source photo) en extrayant le code réel de index.html.
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function one(re, label){ const m = html.match(re); assert.ok(m, 'introuvable : ' + (label || re)); return m[0]; }

const body = `
  ${one(/function famHash\(s\)\{[^\n]*\}/, 'famHash')}
  ${one(/function famEsc\(s\)\{[^\n]*\}/, 'famEsc')}
  ${one(/function famMsgHtml\(s\)\{[^\n]*\}/, 'famMsgHtml')}
  ${one(/function ytId\(url\)\{[^\n]*\}/, 'ytId')}
  ${one(/function photoSrc\(ph\)\{[^\n]*\}/, 'photoSrc')}
  return { famHash, famEsc, famMsgHtml, ytId, photoSrc };
`;
const fam = new Function(body)();

// ── famHash : protège le code PIN (haché, jamais stocké en clair) ──
test('famHash : déterministe et stable', () => {
  assert.strictEqual(fam.famHash('1234'), fam.famHash('1234'));
  assert.strictEqual(typeof fam.famHash('1234'), 'string');
  assert.ok(/^[0-9a-z]+$/.test(fam.famHash('1234')), 'base36');
});

test('famHash : des codes différents donnent des empreintes différentes', () => {
  assert.notStrictEqual(fam.famHash('1234'), fam.famHash('1235'));
  assert.notStrictEqual(fam.famHash('0000'), fam.famHash('1111'));
  assert.notStrictEqual(fam.famHash('12'), fam.famHash('21'));
});

// ── famEsc : empêche l'injection HTML dans les messages ────────────
test('famEsc : échappe & < > " et apostrophe', () => {
  assert.strictEqual(fam.famEsc(`<b>"x"&'`), '&lt;b&gt;&quot;x&quot;&amp;&#39;');
  assert.strictEqual(fam.famEsc('sans danger'), 'sans danger');
  assert.strictEqual(fam.famEsc(null), '');
  assert.strictEqual(fam.famEsc(undefined), '');
});

test('famMsgHtml : convertit les retours à la ligne en <br/> et échappe', () => {
  assert.strictEqual(fam.famMsgHtml('a\nb'), 'a<br/>b');
  assert.strictEqual(fam.famMsgHtml('<\n'), '&lt;<br/>');
});

// ── ytId : intègre les vidéos YouTube directement ──────────────────
test('ytId : reconnaît youtu.be / watch / embed / shorts', () => {
  assert.strictEqual(fam.ytId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(fam.ytId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(fam.ytId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(fam.ytId('https://www.youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
});

test('ytId : null pour les liens non-YouTube', () => {
  assert.strictEqual(fam.ytId('https://vimeo.com/123456'), null);
  assert.strictEqual(fam.ytId('https://icloud.com/album/xyz'), null);
  assert.strictEqual(fam.ytId(''), null);
});

// ── photoSrc : contrat d'affichage galerie (string / .src / .__src / id) ──
test('photoSrc : résout chaîne, .src, .__src, et id non hydraté → ""', () => {
  assert.strictEqual(fam.photoSrc('data:img'), 'data:img');
  assert.strictEqual(fam.photoSrc({ src: 'inline' }), 'inline');
  assert.strictEqual(fam.photoSrc({ __src: 'hydrate' }), 'hydrate');
  assert.strictEqual(fam.photoSrc({ id: 'ph_x' }), '', 'id seul (non hydraté) → vide, donc image ignorée');
  assert.strictEqual(fam.photoSrc(null), '');
});
