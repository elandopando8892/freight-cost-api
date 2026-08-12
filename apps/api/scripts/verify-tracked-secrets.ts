import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Finding = { file: string; kind: string };

const literalPatterns: Array<{ kind: string; expression: RegExp }> = [
  { kind: "OpenAI-style key", expression: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { kind: "private key block", expression: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/ },
  { kind: "Google API key", expression: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { kind: "GitHub token", expression: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { kind: "Slack token", expression: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
];

function isAllowedPlaceholder(value: string) {
  return (
    value === "" ||
    /^(your-|replace-|change-me|stored-in-secret-manager)/i.test(value)
  );
}

function findingsForFile(file: string, content: string): Finding[] {
  const findings = literalPatterns
    .filter(({ expression }) => expression.test(content))
    .map(({ kind }) => ({ file, kind }));

  const environmentAssignment = /^(OPENAI_API_KEY|KINDE_CLIENT_SECRET)\s*=\s*["']?([^"'\r\n]*)/gim;
  for (const match of content.matchAll(environmentAssignment)) {
    if (!isAllowedPlaceholder(match[2].trim())) {
      findings.push({ file, kind: `${match[1]} assignment` });
    }
  }
  return findings;
}

const repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: repositoryRoot, encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);
const findings: Finding[] = [];

for (const file of files) {
  const absolutePath = resolve(repositoryRoot, file);
  const metadata = lstatSync(absolutePath);
  if (!metadata.isFile()) continue;
  const content = readFileSync(absolutePath, "utf8");
  if (content.includes("\0")) continue;
  findings.push(...findingsForFile(file, content));
}

if (findings.length) {
  console.error("Potential secrets found. Values are intentionally not printed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.kind}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Tracked-secret scan passed (${files.length} files checked; values not logged).`);
}
