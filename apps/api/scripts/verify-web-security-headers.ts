import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const nextConfig = readFileSync(resolve(root, "apps/web/next.config.ts"), "utf8");
const quoteDesk = readFileSync(
  resolve(root, "apps/web/app/(app)/quote-desk/quote-desk.tsx"),
  "utf8",
);
const requirements = [
  [nextConfig, "Content-Security-Policy-Report-Only", "header CSP en modo reporte"],
  [nextConfig, "frame-src 'self' https:", "compatibilidad CSP de iframe"],
  [nextConfig, "frame-ancestors 'none'", "protección anti-embebido CSP"],
  [quoteDesk, 'sandbox=""', "sandbox vacío de Quote Desk"],
  [quoteDesk, "srcDoc={preview.data?.html || \"\"}", "preview aislado de Quote Desk"],
] as const;
const findings = requirements
  .filter(([content, expected]) => !content.includes(expected))
  .map(([, , label]) => label);

if (findings.length) {
  console.error("Contrato de headers Web falló:");
  for (const finding of findings) console.error(`- Falta ${finding}.`);
  process.exitCode = 1;
} else {
  console.log("Contrato de headers Web correcto (validación estática sin navegador).");
}
