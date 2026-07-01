// Vérifie le parseur EXIF GPS de index.html sur des buffers fabriqués (MM big-endian + II little-endian).
// Réplique exacte des fonctions parseExif/parseApp1 de l'app (elles n'utilisent que DataView, dispo en Node).
const assert = require('node:assert');
const test = require('node:test');

function parseExif(view){
  if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return null;
  let off = 2; const len = view.byteLength;
  while (off + 4 < len){
    const marker = view.getUint16(off);
    if (marker === 0xFFE1) return parseApp1(view, off + 4);
    if ((marker & 0xFF00) !== 0xFF00) break;
    off += 2 + view.getUint16(off + 2);
  }
  return null;
}
function parseApp1(view, start){
  if (view.getUint32(start) !== 0x45786966) return null; // "Exif"
  const tiff = start + 6;
  const little = view.getUint16(tiff) === 0x4949;
  const g16 = o => view.getUint16(o, little);
  const g32 = o => view.getUint32(o, little);
  if (g16(tiff + 2) !== 0x002A) return null;
  const ifd0 = tiff + g32(tiff + 4);
  let gpsPtr = 0, exifPtr = 0;
  const n0 = g16(ifd0);
  for (let i=0;i<n0;i++){
    const e = ifd0 + 2 + i*12, tag = g16(e);
    if (tag === 0x8825) gpsPtr = tiff + g32(e + 8);
    else if (tag === 0x8769) exifPtr = tiff + g32(e + 8);
  }
  const out = {};
  if (exifPtr){
    const ne = g16(exifPtr);
    for (let i=0;i<ne;i++){
      const e = exifPtr + 2 + i*12;
      if (g16(e) === 0x9003){
        const cnt = g32(e + 4);
        const vOff = cnt > 4 ? tiff + g32(e + 8) : e + 8;
        let s = '';
        for (let c=0;c<cnt-1;c++){ const ch = view.getUint8(vOff + c); if (ch) s += String.fromCharCode(ch); }
        if (s) out.when = s;
      }
    }
  }
  if (gpsPtr){
    const ng = g16(gpsPtr);
    let latRef='', lngRef='', lat=null, lng=null;
    const dms = o => { const r = j => { const den = g32(o + j*8 + 4) || 1; return g32(o + j*8) / den; }; return r(0) + r(1)/60 + r(2)/3600; };
    for (let i=0;i<ng;i++){
      const e = gpsPtr + 2 + i*12, tag = g16(e);
      if (tag === 1) latRef = String.fromCharCode(view.getUint8(e + 8));
      else if (tag === 3) lngRef = String.fromCharCode(view.getUint8(e + 8));
      else if (tag === 2) lat = dms(tiff + g32(e + 8));
      else if (tag === 4) lng = dms(tiff + g32(e + 8));
    }
    if (lat != null && lng != null && isFinite(lat) && isFinite(lng)){
      if (latRef === 'S') lat = -lat;
      if (lngRef === 'W') lng = -lng;
      out.lat = lat; out.lng = lng;
    }
  }
  return (out.lat != null || out.when) ? out : null;
}

// ── Constructeur d'un JPEG EXIF minimal avec GPS (+ DateTimeOriginal optionnel) ──
function buildJpeg({ little, latRef, latDMS, lngRef, lngDMS, when }) {
  // Construit le bloc TIFF, puis l'enveloppe JPEG (FFD8 + APP1 + "Exif\0\0" + TIFF).
  const chunks = [];
  // On calcule les offsets relatifs au début TIFF.
  // Disposition : header(8) | IFD0 | [Exif IFD?] | GPS IFD | data(lat,lng[,date])
  const hasDate = !!when;
  const ifd0Count = hasDate ? 2 : 1;            // GPS ptr (+ Exif ptr)
  const ifd0Start = 8;
  const ifd0Size = 2 + ifd0Count*12 + 4;
  let cursor = ifd0Start + ifd0Size;
  const exifIfdStart = hasDate ? cursor : 0;
  if (hasDate) { const exifSize = 2 + 1*12 + 4; cursor += exifSize; }
  const gpsIfdStart = cursor;
  const gpsCount = 4;
  const gpsSize = 2 + gpsCount*12 + 4;
  cursor += gpsSize;
  const latDataOff = cursor; cursor += 24;
  const lngDataOff = cursor; cursor += 24;
  const dateDataOff = hasDate ? cursor : 0;
  if (hasDate) cursor += (when.length + 1);
  const tiffLen = cursor;

  const buf = Buffer.alloc(tiffLen);
  const w16 = (o,v) => little ? buf.writeUInt16LE(v,o) : buf.writeUInt16BE(v,o);
  const w32 = (o,v) => little ? buf.writeUInt32LE(v,o) : buf.writeUInt32BE(v,o);
  // TIFF header
  buf.write(little ? 'II' : 'MM', 0, 'ascii');
  w16(2, 0x002A); w32(4, ifd0Start);
  // IFD0
  w16(ifd0Start, ifd0Count);
  let e = ifd0Start + 2;
  // Entrée GPS pointer
  w16(e, 0x8825); w16(e+2, 4); w32(e+4, 1); w32(e+8, gpsIfdStart); e += 12;
  if (hasDate) { w16(e, 0x8769); w16(e+2, 4); w32(e+4, 1); w32(e+8, exifIfdStart); e += 12; }
  w32(ifd0Start + 2 + ifd0Count*12, 0); // next IFD = 0
  // Exif IFD (DateTimeOriginal)
  if (hasDate) {
    w16(exifIfdStart, 1);
    const de = exifIfdStart + 2;
    w16(de, 0x9003); w16(de+2, 2); w32(de+4, when.length + 1); w32(de+8, dateDataOff);
    w32(exifIfdStart + 2 + 12, 0);
    buf.write(when, dateDataOff, 'ascii'); // +\0 déjà via alloc
  }
  // GPS IFD
  w16(gpsIfdStart, gpsCount);
  let g = gpsIfdStart + 2;
  // tag1 LatRef (ASCII count2 inline)
  w16(g, 1); w16(g+2, 2); w32(g+4, 2); buf.write(latRef, g+8, 'ascii'); g += 12;
  // tag2 Latitude (RATIONAL count3 → offset)
  w16(g, 2); w16(g+2, 5); w32(g+4, 3); w32(g+8, latDataOff); g += 12;
  // tag3 LngRef
  w16(g, 3); w16(g+2, 2); w32(g+4, 2); buf.write(lngRef, g+8, 'ascii'); g += 12;
  // tag4 Longitude
  w16(g, 4); w16(g+2, 5); w32(g+4, 3); w32(g+8, lngDataOff); g += 12;
  w32(gpsIfdStart + 2 + gpsCount*12, 0);
  // data rationals
  const writeDMS = (o, dms) => { w32(o, dms[0]); w32(o+4, 1); w32(o+8, dms[1]); w32(o+12, 1); w32(o+16, dms[2]); w32(o+20, 1); };
  writeDMS(latDataOff, latDMS);
  writeDMS(lngDataOff, lngDMS);

  // Enveloppe JPEG
  const exifHeader = Buffer.from('Exif\0\0', 'ascii');
  const app1Payload = Buffer.concat([exifHeader, buf]);
  const app1Len = app1Payload.length + 2; // inclut les 2 octets de longueur
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0xFFD8, 0); // SOI
  head.writeUInt16BE(0xFFE1, 2); // APP1
  const lenBuf = Buffer.alloc(2); lenBuf.writeUInt16BE(app1Len, 0);
  const jpeg = Buffer.concat([head, lenBuf, app1Payload, Buffer.from([0xFF, 0xD9])]);
  return new DataView(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength);
}

const approx = (a, b) => Math.abs(a - b) < 1e-4;

test('EXIF GPS — big-endian (MM), N/E (Paris)', () => {
  const v = buildJpeg({ little:false, latRef:'N', latDMS:[48,51,29], lngRef:'E', lngDMS:[2,17,40] });
  const r = parseExif(v);
  assert.ok(r, 'doit renvoyer un objet');
  assert.ok(approx(r.lat, 48 + 51/60 + 29/3600), 'lat Paris');
  assert.ok(approx(r.lng, 2 + 17/60 + 40/3600), 'lng Paris');
});

test('EXIF GPS — little-endian (II), N/E (Tallinn)', () => {
  const v = buildJpeg({ little:true, latRef:'N', latDMS:[59,26,13], lngRef:'E', lngDMS:[24,45,13] });
  const r = parseExif(v);
  assert.ok(r);
  assert.ok(approx(r.lat, 59 + 26/60 + 13/3600), 'lat Tallinn');
  assert.ok(approx(r.lng, 24 + 45/60 + 13/3600), 'lng Tallinn');
});

test('EXIF GPS — hémisphère S/W signé', () => {
  const v = buildJpeg({ little:false, latRef:'S', latDMS:[33,52,4], lngRef:'W', lngDMS:[70,40,2] });
  const r = parseExif(v);
  assert.ok(r.lat < 0 && r.lng < 0, 'S et W doivent être négatifs');
});

test('EXIF — DateTimeOriginal lue', () => {
  const v = buildJpeg({ little:false, latRef:'N', latDMS:[48,51,29], lngRef:'E', lngDMS:[2,17,40], when:'2026:06:23 14:05:11' });
  const r = parseExif(v);
  assert.strictEqual(r.when, '2026:06:23 14:05:11');
  assert.strictEqual(r.when.slice(0,10).replace(/:/g,'-'), '2026-06-23');
});

test('EXIF — photo sans EXIF renvoie null', () => {
  const jpeg = Buffer.from([0xFF,0xD8, 0xFF,0xD9]); // SOI + EOI, aucun APP1
  assert.strictEqual(parseExif(new DataView(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength)), null);
});
