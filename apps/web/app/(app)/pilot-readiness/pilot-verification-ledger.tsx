"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetcher } from "@/lib/fetcher";

type VerificationKind = "STAGING_AUTH_BFF_SMOKE" | "STAGING_AUTH_BFF_HUMAN";
type CheckStatus = "PASS" | "BLOCK";

const requirements: Record<VerificationKind, readonly string[]> = {
  STAGING_AUTH_BFF_SMOKE: [
    "WEB_LOGIN",
    "WEB_CSP_REPORT_ONLY",
    "BFF_UNAUTHENTICATED",
    "API_HEALTH",
    "API_READY",
    "API_CORS",
  ],
  STAGING_AUTH_BFF_HUMAN: [
    "LOGIN_CALLBACK",
    "SETTINGS_IDENTITY",
    "BFF_AUTHENTICATED",
    "BFF_UNAUTHENTICATED",
    "LOGOUT",
  ],
};

const checkLabels: Record<string, string> = {
  WEB_LOGIN: "Login público",
  WEB_CSP_REPORT_ONLY: "CSP Report-Only y aislamiento de frames",
  BFF_UNAUTHENTICATED: "BFF sin sesión (401 / no-store)",
  API_HEALTH: "API /health",
  API_READY: "API /ready",
  API_CORS: "CORS API ↔ Web",
  LOGIN_CALLBACK: "Login y callback Kinde",
  SETTINGS_IDENTITY: "Identidad en Settings",
  BFF_AUTHENTICATED: "BFF con sesión",
  LOGOUT: "Logout y sesión cerrada",
};

export type PilotVerification = {
  id: string;
  kind: VerificationKind;
  outcome: "PASS" | "FAIL";
  releaseId: string;
  executedAt: string;
  summary: string;
  createdAt: string;
  verifiedBy: { id: string; email: string; role: string };
};

export function PilotVerificationLedger({
  initial,
  role,
  currentReleaseId,
}: {
  initial: PilotVerification[];
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  currentReleaseId: string;
}) {
  const [rows, setRows] = useState(initial);
  const [kind, setKind] = useState<VerificationKind>("STAGING_AUTH_BFF_SMOKE");
  const [summary, setSummary] = useState("");
  const required = requirements[kind];
  const [statuses, setStatuses] = useState<Record<string, CheckStatus>>({});
  const checks = useMemo(
    () => required.map((key) => ({ key, status: statuses[key] ?? "PASS" })),
    [required, statuses],
  );
  const outcome = checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL";
  const create = useMutation({
    mutationFn: () =>
      fetcher<{ verification: PilotVerification }>("/api/v1/pilot/verifications", {
        method: "POST",
        json: {
          kind,
          outcome,
          releaseId: currentReleaseId,
          executedAt: new Date().toISOString(),
          summary: summary.trim(),
          checks,
        },
      }),
    onSuccess: ({ verification }) => {
      setRows((items) => [verification, ...items]);
      setSummary("");
      setStatuses({});
    },
  });

  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle className="text-base">Evidencia de staging</CardTitle>
        <CardDescription>
          Registra el resultado de QA por release. PASS documenta evidencia; no autoriza un despliegue ni un GO.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {role === "ADMIN" && (
          <div className="grid gap-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>Tipo de verificación</span>
                <select
                  className="h-9 rounded-md border bg-background px-2"
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as VerificationKind);
                    setStatuses({});
                  }}
                >
                  <option value="STAGING_AUTH_BFF_SMOKE">Smoke anónimo</option>
                  <option value="STAGING_AUTH_BFF_HUMAN">Recorrido humano</option>
                </select>
              </label>
              <div className="grid gap-1 text-sm">
                <span>Release SHA</span>
                <code className="flex h-9 items-center rounded-md border bg-muted px-3 text-xs">
                  {currentReleaseId}
                </code>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {checks.map((check) => (
                <label className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm" key={check.key}>
                  <span>{checkLabels[check.key] ?? check.key}</span>
                  <select
                    aria-label={`Estado ${check.key}`}
                    className="h-8 rounded border bg-background px-2 text-xs"
                    value={check.status}
                    onChange={(event) =>
                      setStatuses((current) => ({
                        ...current,
                        [check.key]: event.target.value as CheckStatus,
                      }))
                    }
                  >
                    <option value="PASS">PASS</option>
                    <option value="BLOCK">BLOCK</option>
                  </select>
                </label>
              ))}
            </div>
            <label className="grid gap-1 text-sm">
              <span>Resumen sin secretos ni datos de clientes</span>
              <textarea
                className="min-h-20 rounded-md border bg-background p-2 text-sm"
                maxLength={2000}
                placeholder="Resultado, fecha y referencia de logs segura. No pegues tokens, cookies ni respuestas completas."
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className={`text-sm font-medium ${outcome === "PASS" ? "text-emerald-600" : "text-rose-600"}`}>
                Resultado calculado: {outcome}
              </span>
              <Button
                disabled={!/^[a-f0-9]{7,64}$/i.test(currentReleaseId) || summary.trim().length < 3 || create.isPending}
                onClick={() => create.mutate()}
              >
                Registrar evidencia
              </Button>
            </div>
            {create.error && (
              <p className="text-sm text-destructive">
                {create.error instanceof Error ? create.error.message : "No se pudo registrar la evidencia."}
              </p>
            )}
          </div>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay verificaciones de staging registradas todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2">Resultado</th>
                  <th className="p-2">Release</th>
                  <th className="p-2">Resumen</th>
                  <th className="p-2">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((verification) => (
                  <tr className="border-b align-top" key={verification.id}>
                    <td className="p-2">
                      <span className={verification.outcome === "PASS" ? "text-emerald-600" : "text-rose-600"}>
                        {verification.outcome}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {verification.kind === "STAGING_AUTH_BFF_SMOKE" ? "Smoke anónimo" : "Recorrido humano"}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-xs">{verification.releaseId}</td>
                    <td className="max-w-md p-2">
                      {verification.summary}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {new Date(verification.executedAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-2">{verification.verifiedBy.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
