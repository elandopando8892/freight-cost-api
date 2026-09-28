import { execFileSync } from "node:child_process";
import { FCM_VERCEL_PROJECT, isFreightCostVercelPreview } from "../src/modules/pilot/oauth-preview-coverage.js";
import { evaluatePreviewPair } from "../src/modules/pilot/preview-pair-gate.js";

const cli = process.env.VERCEL_CLI_PATH?.trim();
const webUrl = process.argv.find(arg => arg.startsWith("--web-url="))?.slice(10);
const apiUrl = process.argv.find(arg => arg.startsWith("--api-url="))?.slice(10);

function isExactPreviewOrigin(value: string | undefined) {
  if (!value || !isFreightCostVercelPreview(value)) return false;
  const parsed = new URL(value);
  return parsed.pathname === "/" && !parsed.search && !parsed.hash;
}

function block(detail: string): never {
  console.log(JSON.stringify({ schemaVersion: "fcm.preview-pair-gate.v1", status: "BLOCK", detail }));
  process.exit(1);
}

if (!cli || !isExactPreviewOrigin(webUrl) || !isExactPreviewOrigin(apiUrl)) {
  block("Se requieren CLI y URLs HTTPS exactas del equipo Vercel verificado.");
}

function deployment(url: string) {
  const host = new URL(url).hostname;
  const endpoint = `/v13/deployments/${host}?teamId=${FCM_VERCEL_PROJECT.teamId}`;
  return JSON.parse(execFileSync(process.execPath,
    [cli!, "api", endpoint, "--method", "GET", "--raw"],
    { encoding: "utf8", windowsHide: true, timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] },
  ));
}

async function probe(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const body = await response.json() as { status?: string; database?: string; release?: string };
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

async function main() {
  const web = deployment(webUrl!);
  const api = deployment(apiUrl!);
  const health = await probe(`${new URL(apiUrl!).origin}/health`);
  const ready = await probe(`${new URL(apiUrl!).origin}/ready`);
  const result = evaluatePreviewPair({ webUrl: webUrl!, apiUrl: apiUrl!, web, api, health, ready });
  console.log(JSON.stringify(result));
  if (result.status !== "PASS") process.exitCode = 1;
}

void main().catch(() => block("No se pudo verificar el par exacto en Vercel. No se realizó ninguna mutación."));
