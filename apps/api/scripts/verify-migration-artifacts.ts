import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const migrationsRoot = resolve(process.cwd(), "apps/api/prisma/migrations");
const lockFile = resolve(migrationsRoot, "migration_lock.toml");
const migrationNames = readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const findings: string[] = [];
const seenTimestamps = new Set<string>();

for (const name of migrationNames) {
  const match = /^(\d{14})_([a-z0-9_]+)$/.exec(name);
  if (!match) {
    findings.push(`${name}: nombre inválido; se espera YYYYMMDDHHMMSS_descripcion.`);
    continue;
  }
  if (seenTimestamps.has(match[1])) {
    findings.push(`${name}: timestamp duplicado ${match[1]}.`);
  }
  seenTimestamps.add(match[1]);

  const sqlFile = resolve(migrationsRoot, name, "migration.sql");
  try {
    if (!statSync(sqlFile).isFile() || !readFileSync(sqlFile, "utf8").trim()) {
      findings.push(`${name}: migration.sql falta o está vacío.`);
    }
  } catch {
    findings.push(`${name}: migration.sql falta o no se puede leer.`);
  }
}

try {
  const lock = readFileSync(lockFile, "utf8");
  if (!/^provider\s*=\s*"postgresql"\s*$/m.test(lock)) {
    findings.push("migration_lock.toml no declara provider = \"postgresql\".");
  }
} catch {
  findings.push("Falta prisma/migrations/migration_lock.toml.");
}

if (!migrationNames.length) findings.push("No se encontraron migraciones Prisma.");

if (findings.length) {
  console.error("Integridad de migraciones falló:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    `Integridad de migraciones correcta (${migrationNames.length} migraciones; validación estática sin conexión).`,
  );
}
