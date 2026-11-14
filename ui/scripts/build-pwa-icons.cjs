/* Deterministic, dependency-free host icons. Rebuild: node ui/scripts/build-pwa-icons.cjs */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([length, name, bytes, checksum]);
}
function icon(size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // T stays inside the central maskable safe zone; the background is opaque.
    const glyph = x >= size * .27 && x < size * .73 && y >= size * .28 && y < size * .4 ||
      x >= size * .44 && x < size * .56 && y >= size * .4 && y < size * .72;
    const colour = glyph ? [186, 222, 82] : [34, 68, 127];
    const offset = y * (size * 3 + 1) + 1 + x * 3;
    colour.forEach((channel, index) => { pixels[offset + index] = channel; });
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
if (require.main === module) {
  const directory = path.resolve(__dirname, '../../workspace/pwa-icons');
  fs.mkdirSync(directory, { recursive: true });
  for (const size of [180, 192, 512]) fs.writeFileSync(path.join(directory, `icon-${size}.png`), icon(size));
}
module.exports = { icon };
