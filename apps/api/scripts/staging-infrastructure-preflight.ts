import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import {
  evaluateStagingInfrastructure,
  type VercelEnvironmentMetadata,
} from "../src/modules/pilot/staging-infrastructure.js";

const VERCEL_CLI_VERSION = "58.9.5";

function emit(value: unknown) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function metadataFor(projectDirectory: string, branch?: string) {
  const path = `${dirname(process.execPath)}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`;
  const vercelArgs = [
    "--yes",
    `vercel@${VERCEL_CLI_VERSION}`,
    "env",
    "ls",
    "preview",
  ];
  if (branch) vercelArgs.push(branch);
  vercelArgs.push("--json", "--no-color", "--non-interactive");
  const executable =
    process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npx";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx ${vercelArgs.join(" ")}`]
      : vercelArgs;
  const result = spawnSync(
    executable,
    args,
    {
      cwd: projectDirectory,
      encoding: "utf8",
      env: { ...process.env, PATH: path },
      windowsHide: true,
      timeout: 60_000,
    },
  );
  if (result.status !== 0) {
    throw new Error("Vercel Preview metadata could not be read.");
  }
  const body = JSON.parse(result.stdout) as { envs?: unknown };
  if (!Array.isArray(body.envs)) {
    throw new Error("Vercel returned an invalid metadata response.");
  }
  return body.envs.map((entry) => {
    const item = entry as Record<string, unknown>;
    return {
      key: typeof item.key === "string" ? item.key : "",
      type: typeof item.type === "string" ? item.type : "",
      target: Array.isArray(item.target)
        ? item.target.filter((value): value is string => typeof value === "string")
        : [],
    } satisfies VercelEnvironmentMetadata;
  });
}

function stagingMetadataFor(projectDirectory: string, branch: string) {
  const entries = new Map(
    metadataFor(projectDirectory).map((entry) => [entry.key, entry]),
  );
  for (const entry of metadataFor(projectDirectory, branch)) {
    entries.set(entry.key, entry);
  }
  return [...entries.values()];
}

function main() {
  if (process.argv.includes("--help")) {
    emit({
      command: "npm run preflight:staging:infra",
      mode: "READ_ONLY_METADATA",
      defaultBranch: "staging",
      note: "Reads Vercel variable names/scopes only; never pulls or prints values.",
    });
    return;
  }
  const root = process.cwd();
  const branch = process.env.STAGING_VERCEL_GIT_BRANCH?.trim() || "staging";
  if (!/^[A-Za-z0-9._/-]{1,128}$/.test(branch)) {
    throw new Error("Invalid STAGING_VERCEL_GIT_BRANCH.");
  }
  const evaluation = evaluateStagingInfrastructure({
    api: stagingMetadataFor(resolve(root, "apps/api"), branch),
    web: stagingMetadataFor(resolve(root, "apps/web"), branch),
  });
  emit({
    schemaVersion: "fcm.staging-infrastructure-preflight.v1",
    mode: "READ_ONLY_METADATA",
    generatedAt: new Date().toISOString(),
    branch,
    secretsRead: false,
    writesAttempted: false,
    ...evaluation,
  });
  process.exitCode = evaluation.ready ? 0 : 1;
}

try {
  main();
} catch {
  process.stderr.write(
    "Staging infrastructure preflight could not run; verify Vercel login, project links and branch name.\n",
  );
  process.exitCode = 1;
}
