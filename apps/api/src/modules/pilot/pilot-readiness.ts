export type PilotCheckStatus = "PASS" | "WARN" | "BLOCK";
export type PilotCheck = {
  key: string;
  status: PilotCheckStatus;
  label: string;
  detail: string;
  href: string;
};

export type PilotReadinessInput = {
  profileComplete: boolean;
  activePricingBases: number;
  productionRoutes: number;
  confirmedQuotes: number;
  invalidConfirmedQuotes: number;
  publishedRateBooks: number;
  pendingApprovals: number;
  ratewareConfigured: boolean;
  deliveredRateBooks: number;
  underReviewScenarioReviews: number;
  scenarioReviewSchemaReady: boolean | null;
  openAIKeyRotationAttested: boolean;
  openAIModelConfigured: boolean;
  stagingSmokeStatus: "PASS" | "MISSING" | "FAIL" | "STALE" | "FUTURE";
  stagingHumanStatus: "PASS" | "MISSING" | "FAIL" | "STALE" | "FUTURE";
};

function verificationDetail(
  kind: "smoke" | "human",
  status: PilotReadinessInput["stagingSmokeStatus"],
) {
  const label = kind === "smoke" ? "smoke" : "recorrido Kinde/BFF";
  switch (status) {
    case "PASS":
      return `La evidencia PASS más reciente del ${label} corresponde al RELEASE_SHA actual y tiene menos de 24 horas.`;
    case "FAIL":
      return `La ejecución más reciente del ${label} para el RELEASE_SHA actual registró FAIL.`;
    case "STALE":
      return `La última evidencia PASS del ${label} para el RELEASE_SHA actual tiene más de 24 horas.`;
    case "FUTURE":
      return `La fecha de la última evidencia del ${label} supera la tolerancia futura de cinco minutos.`;
    default:
      return `No existe evidencia del ${label} para el RELEASE_SHA actual.`;
  }
}

export function buildPilotReadiness(input: PilotReadinessInput) {
  const checks: PilotCheck[] = [
    {
      key: "CARRIER_PROFILE",
      status: input.profileComplete ? "PASS" : "BLOCK",
      label: "Perfil operativo",
      detail: input.profileComplete
        ? "Identidad y contacto del carrier completos."
        : "Falta completar identidad operativa y contacto principal.",
      href: "/onboarding",
    },
    {
      key: "PRICING_BASE",
      status: input.activePricingBases > 0 ? "PASS" : "BLOCK",
      label: "Base tarifaria activa",
      detail:
        input.activePricingBases > 0
          ? `${input.activePricingBases} base(s) activa(s) con versión publicada.`
          : "No hay una base activa con versión publicada.",
      href: "/cost-bases",
    },
    {
      key: "PRODUCTION_ROUTE",
      status: input.productionRoutes > 0 ? "PASS" : "BLOCK",
      label: "Ruta de producción",
      detail:
        input.productionRoutes > 0
          ? `${input.productionRoutes} ruta(s) productiva(s) disponible(s).`
          : "No hay una ruta confirmada para el piloto.",
      href: "/production",
    },
    {
      key: "QUOTE_EVIDENCE",
      status:
        input.confirmedQuotes === 0 || input.invalidConfirmedQuotes > 0
          ? "BLOCK"
          : "PASS",
      label: "Evidencia de cotización",
      detail:
        input.confirmedQuotes === 0
          ? "No hay cotizaciones confirmadas para validar."
          : input.invalidConfirmedQuotes > 0
            ? `${input.invalidConfirmedQuotes} cotización(es) confirmada(s) no reproducen su snapshot.`
            : `${input.confirmedQuotes} cotización(es) confirmada(s) con snapshot reproducible.`,
      href: "/quotes",
    },
    {
      key: "RATEBOOK",
      status: input.publishedRateBooks > 0 ? "PASS" : "BLOCK",
      label: "RateBook publicado",
      detail:
        input.publishedRateBooks > 0
          ? `${input.publishedRateBooks} RateBook(s) publicado(s).`
          : "Publica el tarifario que se usará en el piloto.",
      href: "/ratebooks",
    },
    {
      key: "APPROVAL_QUEUE",
      status: input.pendingApprovals > 0 ? "WARN" : "PASS",
      label: "Aprobaciones pendientes",
      detail:
        input.pendingApprovals > 0
          ? `${input.pendingApprovals} solicitud(es) requieren decisión antes de la operación.`
          : "No hay aprobaciones pendientes.",
      href: "/approvals",
    },
    {
      key: "SCENARIO_REVIEW_QUEUE",
      status: input.underReviewScenarioReviews > 0 ? "WARN" : "PASS",
      label: "Escenarios en revisión",
      detail:
        input.underReviewScenarioReviews > 0
          ? `${input.underReviewScenarioReviews} paquete(s) de escenario requieren una decisión humana.`
          : "No hay escenarios pendientes de revisión.",
      href: "/scenarios",
    },
    {
      key: "SCENARIO_SCHEMA",
      status: input.scenarioReviewSchemaReady ? "PASS" : "BLOCK",
      label: "Migraciones de escenario",
      detail: input.scenarioReviewSchemaReady
        ? "Las migraciones de paquetes y linaje están aplicadas en esta base de datos."
        : input.scenarioReviewSchemaReady === null
          ? "No se pudo comprobar _prisma_migrations; no se puede afirmar que el esquema desplegado esté listo."
          : "Faltan migraciones de paquetes de escenario o su linaje.",
      href: "/pilot-readiness",
    },
    {
      key: "AI_KEY_ROTATION",
      status: input.openAIKeyRotationAttested ? "PASS" : "BLOCK",
      label: "Rotación de clave AI",
      detail: input.openAIKeyRotationAttested
        ? "La configuración del entorno contiene constancia de la rotación de clave."
        : "Falta configurar una nueva clave AI y registrar OPENAI_KEY_ROTATED_AT en el entorno de despliegue.",
      href: "/settings",
    },
    {
      key: "AI_MODEL",
      status: input.openAIModelConfigured ? "PASS" : "BLOCK",
      label: "Modelo AI explícito",
      detail: input.openAIModelConfigured
        ? "El modelo del asistente está configurado explícitamente en el entorno."
        : "Falta OPENAI_MODEL explícito en el entorno de despliegue.",
      href: "/settings",
    },
    {
      key: "STAGING_SMOKE",
      status: input.stagingSmokeStatus === "PASS" ? "PASS" : "BLOCK",
      label: "Smoke de staging",
      detail: verificationDetail("smoke", input.stagingSmokeStatus),
      href: "/pilot-readiness",
    },
    {
      key: "STAGING_HUMAN",
      status: input.stagingHumanStatus === "PASS" ? "PASS" : "BLOCK",
      label: "Recorrido humano de staging",
      detail: verificationDetail("human", input.stagingHumanStatus),
      href: "/pilot-readiness",
    },
    {
      key: "RATEWARE_RECEIPT",
      status: !input.ratewareConfigured
        ? "WARN"
        : input.deliveredRateBooks > 0
          ? "PASS"
          : "WARN",
      label: "Entrega a Rateware",
      detail: !input.ratewareConfigured
        ? "Rateware no está configurado en este entorno; no se validó entrega externa."
        : input.deliveredRateBooks > 0
          ? `${input.deliveredRateBooks} recibo(s) Rateware trazable(s).`
          : "Rateware está configurado, pero no hay una recepción confirmada.",
      href: "/ratebooks",
    },
  ];
  return {
    checks,
    ready: checks.every((check) => check.status !== "BLOCK"),
    blockers: checks.filter((check) => check.status === "BLOCK").length,
    warnings: checks.filter((check) => check.status === "WARN").length,
    policy: "EVIDENCE_BACKED_RELEASE_GATE" as const,
  };
}
