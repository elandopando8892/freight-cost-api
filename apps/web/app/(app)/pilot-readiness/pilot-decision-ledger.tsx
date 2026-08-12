"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";

export type PilotDecision = {
  id: string;
  outcome: "GO" | "NO_GO";
  rationale: string;
  evidencePolicy: string;
  evidenceReady: boolean;
  evidenceBlockers: number;
  evidenceWarnings: number;
  evidenceAt: string;
  createdAt: string;
  decidedBy: { id: string; email: string; role: string };
};

export type PilotGoApproval = {
  id: string;
  releaseId: string;
  roundId: string;
  gateFingerprint: string;
  rationale: string;
  evidenceAt: string;
  createdAt: string;
  approvedBy: { id: string; email: string; role: string };
  decision: { id: string; outcome: "GO" | "NO_GO"; createdAt: string } | null;
};

type PilotDecisionMutation = {
  decision: PilotDecision | null;
  approval: PilotGoApproval | null;
  approvalCount: number;
  requiredApprovals: 2;
  state:
    | "NO_GO_RECORDED"
    | "PENDING_SECOND_APPROVAL"
    | "GO_RECORDED";
};

export function PilotDecisionLedger({
  initial,
  initialApprovals,
  role,
}: {
  initial: PilotDecision[];
  initialApprovals: PilotGoApproval[];
  role: "ADMIN" | "OPERATOR" | "VIEWER";
}) {
  const [rows, setRows] = useState(initial);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [outcome, setOutcome] = useState<"GO" | "NO_GO">("NO_GO");
  const [rationale, setRationale] = useState("");
  const [lastState, setLastState] = useState<
    PilotDecisionMutation["state"] | null
  >(null);
  const create = useMutation({
    mutationFn: () =>
      fetcher<PilotDecisionMutation>("/api/v1/pilot/decisions", {
        method: "POST",
        json: { outcome, rationale },
      }),
    onSuccess: ({ decision, approval, state }) => {
      if (decision) setRows((items) => [decision, ...items]);
      if (approval) {
        setApprovals((items) =>
          [approval, ...items].map((item) =>
            decision && item.roundId === approval.roundId
              ? {
                  ...item,
                  decision: {
                    id: decision.id,
                    outcome: decision.outcome,
                    createdAt: decision.createdAt,
                  },
                }
              : item,
          ),
        );
      }
      setLastState(state);
      setRationale("");
    },
  });
  const status = (decision: PilotDecision) =>
    decision.outcome === "GO"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "bg-rose-500/10 text-rose-700 dark:text-rose-300";

  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle className="text-base">Ledger de decisiones</CardTitle>
        <CardDescription>
          NO-GO se registra inmediatamente. GO exige dos administradores
          distintos que no hayan creado las verificaciones seleccionadas. Nada
          en este ledger despliega, publica ni activa.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {role === "ADMIN" && (
          <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[140px_1fr_auto]">
            <select
              aria-label="Resultado de piloto"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={outcome}
              onChange={(event) =>
                setOutcome(event.target.value as "GO" | "NO_GO")
              }
            >
              <option value="NO_GO">NO-GO</option>
              <option value="GO">GO</option>
            </select>
            <Input
              placeholder="Justificación de la decisión"
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
            />
            <Button
              disabled={rationale.trim().length < 3 || create.isPending}
              onClick={() => create.mutate()}
            >
              {outcome === "GO" ? "Aprobar GO" : "Registrar NO-GO"}
            </Button>
            {create.error && (
              <p className="sm:col-span-3 text-sm text-destructive">
                {create.error instanceof Error
                  ? create.error.message
                  : "No se pudo registrar la decisión."}
              </p>
            )}
            {lastState === "PENDING_SECOND_APPROVAL" && (
              <p className="sm:col-span-3 text-sm text-amber-700 dark:text-amber-300">
                Primera aprobación registrada. Falta un segundo administrador
                independiente sobre la misma evidencia.
              </p>
            )}
            {lastState === "GO_RECORDED" && (
              <p className="sm:col-span-3 text-sm text-emerald-700 dark:text-emerald-300">
                Segunda aprobación registrada y decisión GO cerrada. Esto no
                ejecuta un despliegue.
              </p>
            )}
          </div>
        )}

        <div className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Aprobaciones GO</p>
              <p className="text-xs text-muted-foreground">
                Cada ronda necesita 2 identidades; un cambio de evidencia deja
                de contar para el GO actual.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {approvals.filter((approval) => !approval.decision).length} pendiente(s)
            </span>
          </div>
          {approvals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No hay aprobaciones GO registradas.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {approvals.slice(0, 10).map((approval) => (
                <div
                  className="grid gap-1 rounded border px-3 py-2 text-sm sm:grid-cols-[1fr_auto]"
                  key={approval.id}
                >
                  <div>
                    <span className="font-medium">{approval.approvedBy.email}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {approval.releaseId}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {approval.rationale}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <span>
                      {approval.decision
                        ? `Cerrada: ${approval.decision.outcome}`
                        : "Pendiente"}
                    </span>
                    <span className="block">
                      {new Date(approval.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no se ha registrado una decisión. Descargar evidencia no crea
            una decisión.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2">Resultado</th>
                  <th className="p-2">Evidencia capturada</th>
                  <th className="p-2">Justificación</th>
                  <th className="p-2">Responsable final</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((decision) => (
                  <tr className="border-b align-top" key={decision.id}>
                    <td className="p-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${status(decision)}`}
                      >
                        {decision.outcome}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {new Date(decision.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-2">
                      {decision.evidenceReady
                        ? "Sin bloqueos"
                        : `${decision.evidenceBlockers} bloqueo(s)`}
                      <span className="block text-xs text-muted-foreground">
                        {decision.evidenceWarnings} advertencia(s) ·{" "}
                        {new Date(decision.evidenceAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="max-w-md p-2">
                      {decision.rationale}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {decision.evidencePolicy}
                      </span>
                    </td>
                    <td className="p-2">{decision.decidedBy.email}</td>
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
