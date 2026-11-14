// Revisa que las animaciones de la web usen los tiempos y curvas de MOTION.md.
// Se lanza con: npm run lint:movimiento
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const reglas = [
  { busca: /cubic-bezier\(/, aviso: 'Usa una curva --curva-*, no una escrita a mano' },
  { busca: /(transition|animation)[a-z-]*\s*:[^;]*\b\d*\.?\d+m?s\b/, aviso: 'Usa un tiempo --dur-*, no uno escrito a mano' },
  { busca: /animationDelay|transitionDuration|animationDuration/, aviso: 'Los tiempos van en el CSS con --dur-*, no en el código' },
  { busca: /transition:\s*all\b/, aviso: 'Nada de "transition: all": di qué cambia' },
];

// Las líneas donde se definen los valores son las únicas que pueden llevar números
const esDefinicion = (linea) => /^\s*--(dur|curva|paso)-[a-z]+\s*:/.test(linea);

const archivos = (carpeta) => readdirSync(carpeta, { withFileTypes: true }).flatMap((f) =>
  f.isDirectory() ? archivos(join(carpeta, f.name)) : /\.(css|tsx|ts)$/.test(f.name) ? [join(carpeta, f.name)] : []);

let fallos = 0;
for (const archivo of archivos('src')) {
  readFileSync(archivo, 'utf8').split('\n').forEach((linea, i) => {
    if (esDefinicion(linea)) return;
    // Se mira cada declaración por separado, que hay reglas enteras en una sola línea
    for (const trozo of linea.split(/[;{]/)) {
      for (const { busca, aviso } of reglas) {
        if (busca.test(trozo) && !(trozo.includes('var(--') && !/transition:\s*all\b/.test(trozo) && !/\b\d*\.?\d+m?s\b/.test(trozo.replace(/var\([^)]*\)/g, '')))) {
          console.log(`${archivo}:${i + 1}  ${aviso}`);
          fallos++;
        }
      }
    }
  });
}

console.log(fallos ? `\n${fallos} cosas por arreglar.` : 'Movimiento en orden.');
process.exit(fallos ? 1 : 0);
