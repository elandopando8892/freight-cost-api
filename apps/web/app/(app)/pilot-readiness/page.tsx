import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  PilotDecisionLedger,
  type PilotDecision,
  type PilotGoApproval,
} from "./pilot-decision-ledger";
import {
  PilotVerificationLedger,
  type PilotVerification,
} from "./pilot-verification-ledger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pilot readiness" };

type Check = {
  key: string;
  status: "PASS" | "WARN" | "BLOCK";
  label: string;
  detail: string;
  href: string;
};
type Readiness = {
  generatedAt: string;
  releaseId: string;
  sampledConfirmedQuotes: number;
  checks: Check[];
  ready: boolean;
  blockers: number;
  warnings: number;
  policy: "EVIDENCE_BACKED_RELEASE_GATE";
};
type Context = { role: "ADMIN" | "OPERATOR" | "VIEWER" };
const statusStyle = {
  PASS: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  WARN: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  BLOCK: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};
const statusLabel = { PASS: "Listo", WARN: "Advertencia", BLOCK: "Bloquea" };

export default async function PilotReadinessPage() {
  const [readiness, decisions, goApprovals, verifications, context] = await Promise.all([
    api<Readiness>("/pilot/readiness"),
    api<PilotDecision[]>("/pilot/decisions"),
    api<PilotGoApproval[]>("/pilot/go-approvals"),
    api<PilotVerification[]>("/pilot/verifications"),
    api<Context>("/approvals/context"),
  ]);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Preparación de piloto</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Compuerta de release basada en evidencia. No ejecuta cotizaciones,
            publicaciones ni entregas externas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/api/v1/pilot/evidence.csv"
            className="text-sm font-medium underline underline-offset-2"
          >
            Descargar evidencia CSV
          </Link>
          <span
            className={`rounded-md px-3 py-2 text-sm font-medium ${readiness.ready ? statusStyle.PASS : statusStyle.BLOCK}`}
          >
            {readiness.ready
              ? "Lista para QA controlado"
              : `${readiness.blockers} bloqueo(s) por resolver`}
          </span>
        </div>
      </header>
      <Card className="mb-5">
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
          <Metric label="Bloqueos" value={readiness.blockers} />
          <Metric label="Advertencias" value={readiness.warnings} />
          <Metric
            label="Snapshots revisados"
            value={readiness.sampledConfirmedQuotes}
          />
        </CardContent>
      </Card>
      <section className="grid gap-3">
        {readiness.checks.map((check) => (
          <Card key={check.key}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{check.label}</CardTitle>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[check.status]}`}
                >
                  {statusLabel[check.status]}
                </span>
              </div>
              <CardDescription>{check.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={check.href}
                className="text-sm font-medium underline underline-offset-2"
              >
                Abrir módulo →
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
      <PilotVerificationLedger
        initial={verifications}
        role={context.role}
        currentReleaseId={readiness.releaseId}
      />
      <PilotDecisionLedger
        initial={decisions}
        initialApprovals={goApprovals}
        role={context.role}
      />
      <p className="mt-5 text-xs text-muted-foreground">
        Este tablero confirma únicamente condiciones y evidencia almacenada
        localmente. Una prueba end-to-end, despliegue y autorización de go-live
        siguen siendo pasos separados.
      </p>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
