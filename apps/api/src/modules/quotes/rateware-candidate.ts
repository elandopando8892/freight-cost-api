type Handoff = { lane: { origin: string | null; destination: string | null; operation: string; service: string; equipment: { truckType: string; trailer: string; config: string; driver: string } }; economics: { requiredTariffUsd: number; currency: { primary: string } } }

const hasText = (value: string | null) => typeof value === 'string' && value.trim().length > 0

/** Local mapping check only. Carrier and effective period are deliberately not
 * inferred from a cost quote and must be supplied by a human Rateware workflow. */
export function assessRatewareCandidate(handoff: Handoff) {
  const blockers: string[] = []
  if (!hasText(handoff.lane.origin)) blockers.push('Falta origen.')
  if (!hasText(handoff.lane.destination)) blockers.push('Falta destino.')
  if (!hasText(handoff.lane.operation)) blockers.push('Falta operación.')
  if (!hasText(handoff.lane.service)) blockers.push('Falta servicio.')
  if (
    !hasText(handoff.lane.equipment.truckType)
    || !hasText(handoff.lane.equipment.trailer)
    || !hasText(handoff.lane.equipment.config)
    || !hasText(handoff.lane.equipment.driver)
  ) blockers.push('Falta configuración de equipo completa.')
  if (!Number.isFinite(handoff.economics.requiredTariffUsd) || handoff.economics.requiredTariffUsd <= 0) blockers.push('La tarifa USD no es válida.')
  if (!hasText(handoff.economics.currency.primary)) blockers.push('Falta la moneda primaria del paquete.')
  return { structurallyReady: blockers.length === 0, blockers, humanEnrichmentRequired: ['carrier', 'effectiveDate', 'rateOwner'], mapped: { origin: handoff.lane.origin, destination: handoff.lane.destination, operation: handoff.lane.operation, service: handoff.lane.service, equipment: handoff.lane.equipment, allInUsd: handoff.economics.requiredTariffUsd, currency: handoff.economics.currency.primary } }
}

export function assessRatewareReadiness(input: {
  confirmationEligibility: { eligible: boolean; reasons: readonly string[] }
  ratewareCandidate: ReturnType<typeof assessRatewareCandidate> | null
  enrichmentReady: boolean
  enrichmentBlockers?: readonly string[]
  packageBlockers?: readonly string[]
}) {
  const blockers = [
    ...input.confirmationEligibility.reasons,
    ...(input.ratewareCandidate?.blockers ?? []),
    ...(input.enrichmentBlockers ?? []),
    ...(input.packageBlockers ?? []),
  ]
  if (input.confirmationEligibility.eligible && !input.ratewareCandidate) {
    blockers.push('No se pudo construir el paquete estructural de Rateware.')
  }
  if (!input.enrichmentReady && (input.enrichmentBlockers?.length ?? 0) === 0) {
    blockers.push('Falta completar el enriquecimiento requerido de Rateware.')
  }
  const uniqueBlockers = [...new Set(blockers)]
  return {
    ready: input.confirmationEligibility.eligible
      && input.ratewareCandidate?.structurallyReady === true
      && input.enrichmentReady
      && uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
  }
}
