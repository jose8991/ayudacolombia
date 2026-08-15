// Genera iconos de instalación PWA sin depender de librerías de imagen: solo zlib.
// Fondo a sangre y una cruz blanca centrada, que sobrevive al recorte circular de
// Android (zona segura del 80 %). El color entra por parámetro.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WHITE = [0xff, 0xff, 0xff];

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function renderIcon(size, brand) {
  // La cruz ocupa el 46 % del lienzo, con brazos del 30 % de su lado.
  const armLength = Math.round(size * 0.46);
  const armWidth = Math.round(armLength * 0.3);
  const center = size / 2;
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x += 1) {
      const dx = Math.abs(x - center + 0.5);
      const dy = Math.abs(y - center + 0.5);
      const inCross =
        (dx <= armWidth / 2 && dy <= armLength / 2) || (dy <= armWidth / 2 && dx <= armLength / 2);
      const [r, g, b] = inCross ? WHITE : brand;
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits por canal
  header[9] = 2; // color verdadero RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * @param {{ outDir: string, color?: [number, number, number], sizes?: number[] }} options
 */
export function generateIcons({ outDir, color = [0x16, 0x79, 0x5d], sizes = [180, 192, 512] }) {
  mkdirSync(outDir, { recursive: true });
  return sizes.map((size) => {
    const file = join(outDir, `icon-${size}.png`);
    writeFileSync(file, renderIcon(size, color));
    return file;
  });
}
