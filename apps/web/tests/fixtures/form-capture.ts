import type { FormValue } from '../../app/(app)/scenarios/benchmark/benchmark-form'

// A projection of the real dynamic capture used by tests, not a validated
// pricing input. FormValue deliberately permits malformed scalar captures.
type Fields = Record<string, FormValue>
type Measure = Fields & { value: FormValue }
type NationalCapture = Fields & {
  trip: Fields & { loadedKm: Measure }
  parameters: Fields & { evidence: FormValue[]; parameters: Measure[] }
}
export type FormCapture = Fields & {
  route: Fields & {
    direction: string; serviceDate: string; mx: NationalCapture; us: NationalCapture
    route: Fields & { usEndpoint: string }
  }
  fixed: Fields & { capital: Fields & { evidence: FormValue[]; acquisitionCost: Measure } }
  trailer: Fields & { evidence: FormValue[] }
}
