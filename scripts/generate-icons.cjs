// One-off icon generator: dependency-free PNGs (Node zlib only).
// Maroon rounded square + white cross, matching the app theme.
// 192/512 (+ maskable 512 with safe-zone padding) + apple-touch-icon.
const { createWriteStream, mkdirSync } = require("node:fs");
const { join, dirname } = require("node:path");
const zlib = require("node:zlib");

const OUT = join(__dirname, "..", "public", "icons");

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", (() => {
      const b = Buffer.alloc(13);
      b.writeUInt32BE(width, 0);
      b.writeUInt32BE(height, 4);
      b[8] = 8; b[9] = 6;
      return b;
    })()),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Rounded square: maroon background, white cross.
function draw(size, pad) {
  const px = Buffer.alloc(size * size * 4);
  const R = 0x2b, G = 0x0a, B = 0x0a; // deep maroon #2B0A0A
  const radius = size * 0.22;
  const crossW = size * (pad ? 0.14 : 0.2);
  const crossL = size * (pad ? 0.36 : 0.52);
  const corner = (x, y, cx, cy) => (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inMiddleX = x >= radius && x < size - radius;
      const inMiddleY = y >= radius && y < size - radius;
      const inside = inMiddleX || inMiddleY ||
        corner(x, y, radius, radius) ||
        corner(x, y, size - radius, radius) ||
        corner(x, y, radius, size - radius) ||
        corner(x, y, size - radius, size - radius);
      const cx = Math.abs(x + 0.5 - size / 2), cy = Math.abs(y + 0.5 - size / 2);
      const cross = cx <= crossW / 2 && cy <= crossL / 2 || cy <= crossW / 2 && cx <= crossL / 2;
      const o = (y * size + x) * 4;
      if (cross && inside) { px[o] = 255; px[o + 1] = 255; px[o + 2] = 255; px[o + 3] = 255; }
      else if (inside) { px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = 255; }
      else { px[o] = 0; px[o + 1] = 0; px[o + 2] = 0; px[o + 3] = 0; }
    }
  }
  return px;
}

function write(name, size, pad) {
  const fs = require("node:fs");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(join(OUT, name), png(size, size, draw(size, pad)));
  console.log("wrote", name, size + "x" + size);
}

write("icon-192.png", 192, false);
write("icon-512.png", 512, false);
write("icon-maskable-512.png", 512, true);
write("apple-touch-icon.png", 180, false);
