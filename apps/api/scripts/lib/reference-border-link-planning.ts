import {z} from 'zod'

/** Public evidence + explicit spatial/time transfers, never provider approval.
 * Includes the span in the hypothesized link; SAKBE's MX access is not added. */
export const BorderLinkPlanningSchema=z.object({
  model:z.literal('FCM_PUBLIC_BORDER_YARD_LINK_FORECAST_V1'),reviewedAt:z.string().datetime(),
  scope:z.literal('MX_SAKBE_REFERENCE_POINT_TO_US_REFERENCE_YARD_PLANNING_TRANSFER'),
  usReferenceYard:z.literal('18702 Metropolitan Road, Laredo, TX 78045'),
  publishedBridgeProximityMiles:z.literal(5),internationalMileKm:z.literal(1.609344),
  linkDistanceKmPerMovementHypothesis:z.literal(8.04672),nationalApproachMinutesPerMovementHypothesis:z.literal(14),
  distanceTransfer:z.literal('ROUNDED_ADVERTISED_BRIDGE_PROXIMITY_TRANSFERRED_TO_WHOLE_REFERENCE_LINK_INCLUDING_SPAN_NOT_MEASURED_GATE_TO_GATE'),
  clockTransfer:z.literal('PRIOR_PUBLIC_US_POI_APPROACH_TIME_TRANSFERRED_OUTSIDE87MIN_COMPLETE_CROSSING_NO_OVERLAP_ASSUMED_NOT_OBSERVED'),
  mxSakbeApproachAddedAgain:z.literal(false),bridgeSpanAddedAgain:z.literal(false),usPostalLegAddedAgain:z.literal(false),
  sourceEndpointMatched:z.literal(false),reverseGeometryObserved:z.literal(false),truckRouteValidated:z.literal(false),
  source:z.object({id:z.literal('OUTPOST_REPRESENTATIVE_PROPERTY_PROXIMITY'),
    url:z.literal('https://www.cityfeet.com/cont/listing/18702-metropolitan-rd-laredo-tx-78045/cs34964524'),
    capture:z.literal('PRIMARY_REPRESENTATIVE_WEB_READER_NOT_ARCHIVED'),locator:z.string().min(40)}).strict(),
  yardIdentityUrl:z.literal('https://outpost.us/locations/laredo-metropolitan/'),
  priorEvidence:z.object({file:z.literal('docs/research/B2_BORDER_APPROACH_CONTRAST_2026-10-02.md'),
    sha256:z.literal('e5bf512cd0fc6577adce879ec488404ab00184dd631ca58317dbda1ba89d25b3')}).strict(),
  assumptions:z.array(z.string().min(30)).min(12),quoteReady:z.literal(false),adoptedOperationalValues:z.literal(0),
}).strict()

export const readBorderLinkPlanning=(raw:unknown)=>BorderLinkPlanningSchema.parse(raw)
