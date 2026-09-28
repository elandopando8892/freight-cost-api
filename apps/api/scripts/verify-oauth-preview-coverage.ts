import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FCM_SCOPED_PREVIEW_CALLBACK_PATTERN,
  FCM_SUPABASE_PROJECT,
  FCM_VERCEL_PROJECT,
  findCoveringRedirect,
  isFreightCostVercelPreview,
  isRecognizedFreightCostCheckoutProject,
  isVerifiedFreightCostWebDeployment,
  previewCallbackUrl,
} from "../src/modules/pilot/oauth-preview-coverage.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../../..");
const linkedProject = JSON.parse(
  readFileSync(resolve(repositoryRoot, ".vercel/project.json"), "utf8"),
) as { orgId?: string; projectId?: string; projectName?: string };

const previewArgument = process.argv.find((value) =>
  value.startsWith("--preview-url="),
);
const previewUrl =
  previewArgument?.slice("--preview-url=".length) ||
  process.env.FCM_WEB_PREVIEW_URL?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const jsonOutput = process.argv.includes("--json");

function stop(message: string): never {
  if (jsonOutput) {
    console.log(JSON.stringify({ status: "BLOCK", detail: message }));
  } else {
    console.error(`[BLOCK] ${message}`);
  }
  process.exit(1);
}

if (!previewUrl) {
  stop(
    "Indica FCM_WEB_PREVIEW_URL o --preview-url=https://... para comprobar el deployment que se revisará.",
  );
}
if (!accessToken) {
  stop(
    "Falta SUPABASE_ACCESS_TOKEN en el proceso. Úsalo sólo para esta lectura; no lo guardes como variable del deployment.",
  );
}
if (!isRecognizedFreightCostCheckoutProject(linkedProject)) {
  stop("El checkout no está vinculado a uno de los dos proyectos FCM verificados del equipo.");
}
if (!isFreightCostVercelPreview(previewUrl)) {
  stop("La URL no pertenece al prefijo y equipo Vercel verificados para Freight Cost Model.");
}

const cli = process.env.VERCEL_CLI_PATH?.trim();
if (!cli) stop("Falta VERCEL_CLI_PATH para verificar el deployment Web exacto en Vercel.");
let deployment: {
  id?: string;
  projectId?: string;
  url?: string;
  readyState?: string;
  target?: string | null;
  meta?: { gitCommitSha?: string; gitCommitRef?: string };
};
try {
  const hostname = new URL(previewUrl).hostname;
  const endpoint = `/v13/deployments/${hostname}?teamId=${FCM_VERCEL_PROJECT.teamId}`;
  deployment = JSON.parse(execFileSync(process.execPath,
    [cli, "api", endpoint, "--method", "GET", "--raw"],
    { encoding: "utf8", windowsHide: true, timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] },
  ));
} catch {
  stop("No se pudo verificar el deployment exacto en Vercel; no se evaluó la cobertura OAuth.");
}
if (!isVerifiedFreightCostWebDeployment(previewUrl, deployment)) {
  stop("La URL no resuelve a un deployment Preview READY del proyecto Web FCM verificado.");
}

const headers = { Authorization: `Bearer ${accessToken}` };
async function main() {
  const [projectResponse, authResponse] = await Promise.all([
    fetch(`https://api.supabase.com/v1/projects/${FCM_SUPABASE_PROJECT.ref}`, {
      headers,
    }),
    fetch(
      `https://api.supabase.com/v1/projects/${FCM_SUPABASE_PROJECT.ref}/config/auth`,
      { headers },
    ),
  ]);
  if (!projectResponse.ok || !authResponse.ok) {
    stop(
      `No se pudo leer la configuración Supabase (${projectResponse.status}/${authResponse.status}).`,
    );
  }

  const project = (await projectResponse.json()) as {
    id?: string;
    name?: string;
    status?: string;
  };
  const auth = (await authResponse.json()) as {
    site_url?: string;
    uri_allow_list?: string;
  };
  if (
    project.id !== FCM_SUPABASE_PROJECT.ref ||
    project.name !== FCM_SUPABASE_PROJECT.name
  ) {
    stop("El token no devolvió el proyecto Supabase rateware-prod verificado.");
  }

  const redirectAllowList = (auth.uri_allow_list ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const callback = previewCallbackUrl(previewUrl);
  const coveringRedirect = findCoveringRedirect(previewUrl, redirectAllowList);
  const result = {
    schemaVersion: "fcm.oauth-preview-coverage.v1",
    status: coveringRedirect ? "PASS" : "BLOCK",
    vercelProject: FCM_VERCEL_PROJECT.name,
    vercelDeploymentId: deployment.id ?? null,
    deployedSha: deployment.meta?.gitCommitSha ?? null,
    deployedRef: deployment.meta?.gitCommitRef ?? null,
    supabaseProject: FCM_SUPABASE_PROJECT.name,
    supabaseStatus: project.status ?? "UNKNOWN",
    callback,
    coveredBy: coveringRedirect,
    proposedScopedPattern: FCM_SCOPED_PREVIEW_CALLBACK_PATTERN,
    siteUrlChanged: false,
    remoteMutationPerformed: false,
  };

  if (jsonOutput) console.log(JSON.stringify(result));
  else {
    console.log("Freight Cost Model — cobertura OAuth de preview (lectura remota)");
    console.log(`[${result.status}] Callback: ${callback}`);
    console.log(
      coveringRedirect
        ? `Cubierto por: ${coveringRedirect}`
        : `No está cubierto. Patrón mínimo propuesto: ${FCM_SCOPED_PREVIEW_CALLBACK_PATTERN}`,
    );
    console.log("No se modificó Supabase, Vercel, Site URL ni ninguna base de datos.");
  }

  if (!coveringRedirect) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  stop(error instanceof Error ? error.message : "Falló la comprobación OAuth.");
});
