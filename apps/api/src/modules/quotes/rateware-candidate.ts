type Handoff = { lane: { origin: string | null; destination: string | null; operation: string; service: string; equipment: { truckType: string; trailer: string; config: string; driver: string } }; economics: { requiredTariffUsd: number; currency: { primary: string } } }

/** Local mapping check only. Carrier and effective period are deliberately not
 * inferred from a cost quote and must be supplied by a human Rateware workflow. */
export function assessRatewareCandidate(handoff: Handoff) {
  const blockers: string[] = []
  if (!handoff.lane.origin) blockers.push('Falta origen.')
  if (!handoff.lane.destination) blockers.push('Falta destino.')
  if (!handoff.lane.operation) blockers.push('Falta operación.')
  if (!handoff.lane.service) blockers.push('Falta servicio.')
  if (!handoff.lane.equipment.truckType || !handoff.lane.equipment.trailer || !handoff.lane.equipment.config) blockers.push('Falta configuración de equipo.')
  if (!Number.isFinite(handoff.economics.requiredTariffUsd) || handoff.economics.requiredTariffUsd <= 0) blockers.push('La tarifa USD no es válida.')
  return { structurallyReady: blockers.length === 0, blockers, humanEnrichmentRequired: ['carrier', 'effectiveDate', 'rateOwner'], mapped: { origin: handoff.lane.origin, destination: handoff.lane.destination, operation: handoff.lane.operation, service: handoff.lane.service, equipment: handoff.lane.equipment, allInUsd: handoff.economics.requiredTariffUsd, currency: handoff.economics.currency.primary } }
}
