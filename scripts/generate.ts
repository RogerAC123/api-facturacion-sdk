/**
 * Descarga la spec OpenAPI desde la API en ejecución y genera los tipos TS.
 *
 *   npm run gen [-- --url=http://localhost:3000/docs/json]
 *
 * Salida:
 *   openapi.json        (spec descargada, ignorada por git)
 *   src/types.ts        (paths/components tipados generados)
 */
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const URL_ARG = process.argv
  .find((a) => a.startsWith("--url="))
  ?.split("=")[1];

const SPEC_URL =
  URL_ARG ?? process.env.OPENAPI_URL ?? "http://localhost:3000/docs/json";

async function main(): Promise<void> {
  console.log(`Descargando spec de ${SPEC_URL}...`);
  const response = await fetch(SPEC_URL);
  if (!response.ok) {
    throw new Error(
      `Falló la descarga (${response.status}). ¿La API está corriendo?`
    );
  }
  const spec = await response.json();

  const specPath = path.join(ROOT, "openapi.json");
  await writeFile(specPath, JSON.stringify(spec, null, 2), "utf-8");
  console.log(`Spec guardada en ${specPath}`);

  const typesPath = path.join(ROOT, "src", "types.ts");
  console.log(`Generando ${typesPath}...`);
  execSync(`npx openapi-typescript "${specPath}" -o "${typesPath}"`, {
    stdio: "inherit",
    cwd: ROOT,
  });

  console.log(`\nListo. Versión: ${spec.info?.version}`);
  console.log(`  Endpoints: ${Object.keys(spec.paths ?? {}).length}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
