import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const schemaFile = resolve(root, "apps/api/prisma/schema.prisma");
const migrationFile = resolve(
  root,
  "apps/api/prisma/migrations/20260830000200_finalize_supabase_identity/migration.sql",
);
const historicalMigrationFile = resolve(root, 'apps/api/prisma/migrations/20261008052054_preserve_historical_authors/migration.sql');

const findings: string[] = [];
let schema = "";
let migration = "";

try {
  schema = readFileSync(schemaFile, "utf8");
} catch {
  findings.push(`No se puede leer ${schemaFile}.`);
}

try {
  migration = readFileSync(migrationFile, "utf8");
} catch {
  findings.push(`No se puede leer ${migrationFile}.`);
}

if (schema) {
  const userModel = /model User \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? "";
  if (!/^\s*supabaseId\s+String\?\s+@unique/m.test(userModel)) {
    findings.push("User.supabaseId debe admitir autores históricos sin login y conservar unicidad de vínculos reales.");
  }
  if (/^\s*kindeId\s+/m.test(userModel)) {
    findings.push("User.kindeId todavía existe en el esquema Prisma activo.");
  }
}

try {
  const historical = readFileSync(historicalMigrationFile, 'utf8').replace(/^\s*--.*$/gm, '').trim();
  if (historical !== 'ALTER TABLE "User" ALTER COLUMN "supabaseId" DROP NOT NULL;') {
    findings.push('La extensión de autores históricos debe limitarse a la nulabilidad, sin borrar filas, índices o relaciones.');
  }
} catch { findings.push('Falta la extensión de persistencia para autores históricos.'); }

if (migration) {
  const guard = migration.indexOf('WHERE "supabaseId" IS NULL');
  const notNull = migration.indexOf('ALTER COLUMN "supabaseId" SET NOT NULL');
  const dropIndex = migration.indexOf('DROP INDEX IF EXISTS "User_kindeId_key"');
  const dropColumn = migration.indexOf('DROP COLUMN "kindeId"');
  if (guard < 0) findings.push("La migración no bloquea usuarios sin supabaseId.");
  if (notNull < 0) findings.push("La migración no vuelve obligatorio supabaseId.");
  if (dropIndex < 0) findings.push("La migración no retira el índice legado de Kinde.");
  if (dropColumn < 0) findings.push("La migración no retira la columna kindeId.");
  if (
    [guard, notNull, dropIndex, dropColumn].every((position) => position >= 0) &&
    !(guard < notNull && notNull < dropIndex && dropIndex < dropColumn)
  ) {
    findings.push("El gate de conciliación debe ejecutarse antes del retiro de Kinde.");
  }
  if (!/^BEGIN;/m.test(migration) || !/^COMMIT;/m.test(migration)) {
    findings.push("La migración final debe ser atómica (BEGIN/COMMIT).");
  }
}

if (findings.length) {
  console.error("Contrato de corte Supabase Auth falló:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    "Contrato de autores históricos correcto: vínculo Supabase opcional y único; guard/atomicidad del retiro legado preservados. Esto no acredita aplicación remota ni permite saltar el retiro pendiente.",
  );
}
