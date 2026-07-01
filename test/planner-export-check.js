// Teste la logique PURE d'export d'itinéraire du planificateur (waypoints, URLs Maps, .ics).
// Réplique fidèle des fonctions de index.html (qui dépendent du DOM/localStorage et ne sont
// pas importables) — même approche que poi-check.js.
const assert = require('node:assert');
const test = require('node:test');

const _cityKey = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

function stageWaypoints(stages){
  const pts = [];
  stages.forEach(s => { if (s.from) pts.push(s.from); if (s.to) pts.push(s.to); });
  return pts.filter((c,i) => i===0 || _cityKey(c) !== _cityKey(pts[i-1]));
}
function googleDirUrl(cities){
  return 'https://www.google.com/maps/dir/' + cities.map(c => encodeURIComponent(c)).join('/');
}
function appleStageUrl(from, to){
  return `https://maps.apple.com/?saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}&dirflg=d`;
}
function buildICS(stages){
  const pad = n => String(n).padStart(2,'0');
  const fold = s => s.replace(/\r?\n/g,'\\n');
  const dstamp = new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
  const addDay = (ymd, d) => { const dt = new Date(ymd+'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate()+d); return dt; };
  const ymd = dt => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}`;
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Road Trip Moto//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  let n = 0;
  stages.forEach((s, idx) => {
    if (!s.date) return;
    const start = new Date(s.date+'T00:00:00Z');
    const desc = [];
    if (s.km) desc.push(`Distance : ${s.km} km`);
    if (s.hotel) desc.push(`Hébergement : ${s.hotel}`);
    if (s.note) desc.push(`Note : ${s.note}`);
    if (s.from && s.to) desc.push(`Itinéraire : ${googleDirUrl([s.from,s.to])}`);
    lines.push('BEGIN:VEVENT',
      `UID:roadtrip-${idx}-${s.date}@moto`,
      `DTSTAMP:${dstamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`,
      `DTEND;VALUE=DATE:${ymd(addDay(s.date,1))}`,
      `SUMMARY:🏍️ ${fold((s.from||'?')+' → '+(s.to||'?'))}`,
      `DESCRIPTION:${fold(desc.join('\n'))}`,
      s.to ? `LOCATION:${fold(s.to)}` : 'LOCATION:',
      'END:VEVENT');
    n++;
  });
  lines.push('END:VCALENDAR');
  return { ics: lines.join('\r\n'), count: n };
}

const SAMPLE = [
  { from:'Paris', to:'Bruxelles', km:310, date:'2026-07-01', hotel:'Hôtel Centre', note:'Péage' },
  { from:'Bruxelles', to:'Berlin', km:660, date:'2026-07-02' },
  { from:'Berlin', to:'Varsovie', km:575 } // sans date → exclue de l'ICS
];

test('stageWaypoints : enchaîne les villes sans doublon consécutif', () => {
  assert.deepStrictEqual(stageWaypoints(SAMPLE), ['Paris','Bruxelles','Berlin','Varsovie']);
});

test('stageWaypoints : dédoublonne en ignorant les accents/casse', () => {
  const wp = stageWaypoints([{ from:'Varsovie', to:'VARSOVIE' }, { from:'Vàrsovie', to:'Vilnius' }]);
  assert.deepStrictEqual(wp, ['Varsovie','Vilnius']);
});

test('googleDirUrl : URL multi-étapes encodée', () => {
  assert.strictEqual(googleDirUrl(['Paris','Bruxelles','Berlin']),
    'https://www.google.com/maps/dir/Paris/Bruxelles/Berlin');
  assert.ok(googleDirUrl(['Saint-Étienne']).includes('Saint-%C3%89tienne'), 'encodage accents');
});

test('appleStageUrl : format Plans avec mode conduite', () => {
  assert.strictEqual(appleStageUrl('Paris','Berlin'),
    'https://maps.apple.com/?saddr=Paris&daddr=Berlin&dirflg=d');
});

test('buildICS : 1 évènement par étape datée (étapes sans date ignorées)', () => {
  const { ics, count } = buildICS(SAMPLE);
  assert.strictEqual(count, 2, '2 étapes datées');
  assert.strictEqual(ics.split('BEGIN:VEVENT').length - 1, 2, '2 VEVENT');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'entête VCALENDAR');
  assert.ok(ics.trim().endsWith('END:VCALENDAR'), 'fin VCALENDAR');
  assert.ok(ics.includes('\r\n'), 'sauts de ligne CRLF (norme iCalendar)');
});

test('buildICS : dates correctes (journée + lendemain)', () => {
  const { ics } = buildICS(SAMPLE);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260701'), 'début 1er juillet');
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260702'), 'fin = lendemain');
  assert.ok(ics.includes('SUMMARY:🏍️ Paris → Bruxelles'), 'résumé from → to');
  assert.ok(ics.includes('LOCATION:Bruxelles'), 'lieu = arrivée');
});

test('buildICS : aucune étape datée → calendrier vide mais valide', () => {
  const { ics, count } = buildICS([{ from:'A', to:'B' }]);
  assert.strictEqual(count, 0);
  assert.ok(ics.includes('BEGIN:VCALENDAR') && ics.includes('END:VCALENDAR'));
  assert.strictEqual(ics.split('BEGIN:VEVENT').length - 1, 0);
});
