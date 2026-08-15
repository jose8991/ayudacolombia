// Los iconos de esta aplicación: el generador vive en el paquete compartido.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateIcons } from '@timeliber/kit/pwa/generate-icons.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
for (const file of generateIcons({ outDir })) console.log(`icono -> ${file}`);
