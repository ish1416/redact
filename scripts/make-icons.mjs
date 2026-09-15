// Draws the Redact mark — a molten field with one black bar across it — and
// writes PNGs without an image dependency. Run once; the PNGs are committed.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../extension/icons/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp = (n) => Math.max(0, Math.min(1, n));

function rounded(px, py, w, h, r) {
  const dx = Math.abs(px - 0.5) - (w / 2 - r);
  const dy = Math.abs(py - 0.5) - (h / 2 - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r <= 0;
}

function render(size) {
  const SS = 4;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          if (!rounded(px, py, 0.94, 0.94, 0.21)) continue;
          const t = clamp((px + py) / 2);
          let pr = 255 - t * 40;
          let pg = 122 - t * 80;
          let pb = 0;
          // The redaction bar: black, inset, with a cut in the middle.
          if (py > 0.4 && py < 0.61 && px > 0.19 && px < 0.81 && !(px > 0.49 && px < 0.56)) {
            pr = 10;
            pg = 5;
            pb = 3;
          }
          r += pr;
          g += pg;
          b += pb;
          a += 255;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = Math.round(a / n);
    }
  }
  return png(size, out);
}

for (const size of [16, 32, 48, 128]) {
  writeFileSync(`${OUT}icon${size}.png`, render(size));
  console.log(`icon${size}.png`);
}
