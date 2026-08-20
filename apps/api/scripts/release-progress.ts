import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Track = {
  key: string;
  label: string;
  weight: number;
  progress: number;
  status: string;
  evidence: string;
  blockers: string[];
  nextAction: string;
};

type ProgressFile = {
  schemaVersion: string;
  updatedAt: string;
  target: string;
  tracks: Track[];
  productionGates: Array<{
    key: string;
    label: string;
    status: string;
    progress: number;
  }>;
};

const path = resolve(process.cwd(), "release-progress.json");
const data = JSON.parse(readFileSync(path, "utf8")) as ProgressFile;

function assertProgress(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} debe estar entre 0 y 100.`);
  }
}

const weightTotal = data.tracks.reduce((total, track) => {
  assertProgress(track.progress, `${track.label}.progress`);
  if (!Number.isFinite(track.weight) || track.weight <= 0) {
    throw new Error(`${track.label}.weight debe ser positivo.`);
  }
  return total + track.weight;
}, 0);

const overall = data.tracks.reduce(
  (total, track) => total + track.weight * track.progress,
  0,
) / weightTotal;
const roundedOverall = Math.round((overall + Number.EPSILON) * 10) / 10;

for (const gate of data.productionGates) {
  assertProgress(gate.progress, `${gate.label}.progress`);
}

console.log(`Freight Cost Model — avance hacia producción (${data.updatedAt})`);
console.log(`Avance general ponderado: ${roundedOverall.toFixed(1)}%`);
console.log("");
console.table(
  data.tracks.map(({ key, label, weight, progress, status }) => ({
    key,
    frente: label,
    peso: `${weight}%`,
    avance: `${progress}%`,
    estado: status,
  })),
);
console.log("Gates de producción:");
for (const gate of data.productionGates) {
  console.log(`- ${gate.label}: ${gate.progress}% · ${gate.status}`);
}
console.log("");
console.log("Bloqueadores abiertos:");
for (const track of data.tracks) {
  for (const blocker of track.blockers) {
    console.log(`- [${track.label}] ${blocker}`);
  }
}
