/**
 * ReferenceKey — the canonical lane key the V3.0 QuoteDesk uses to match a leg
 * (mexLaneProd!CL / usaLaneProd!BV). Both legs share the structure:
 *
 *   UPPER("{origin} - {dest} {truckType} {trailer} {config} {operation} {service*} {driver}")
 *
 * where service* normalizes **Backhaul → One Way** (the client-facing commercial
 * key is always one-way) and the MX leg homologates city state names to 2-letter
 * codes (cusCatalog X→Y), e.g. "Monterrey, Nuevo Leon" → "Monterrey, NL".
 */
import type { EquipmentSpec } from './engine.types.js'

/** Mexican state → 2-letter code — the full 32-state cusCatalog homologation. */
const MX_STATE_CODE: Record<string, string> = {
  Aguascalientes: 'AG', 'Baja California': 'BN', 'Baja California Sur': 'BS', Campeche: 'CM',
  Chiapas: 'CS', Chihuahua: 'CH', Coahuila: 'CU', Colima: 'CL', DF: 'DF', Durango: 'DU',
  Guanajuato: 'GJ', Guerrero: 'GR', Hidalgo: 'HG', Jalisco: 'JA', Mexico: 'MX', Michoacan: 'MC',
  Morelos: 'MR', Nayarit: 'NA', 'Nuevo Leon': 'NL', Oaxaca: 'OA', Puebla: 'PB', Queretaro: 'QE',
  'Quintana Roo': 'QR', 'San Luis Potosi': 'SL', Sinaloa: 'SI', Sonora: 'SO', Tabasco: 'TB',
  Tamaulipas: 'TM', Tlaxcala: 'TL', Veracruz: 'VE', Yucatan: 'YU', Zacatecas: 'ZA',
}

/** Homologate a MX "City, State" → "City, CODE" (matches cusCatalog X→Y; identity if unknown). */
export function homologateMx(cityState: string): string {
  const s = (cityState ?? '').trim()
  const i = s.lastIndexOf(', ')
  if (i < 0) return s
  const code = MX_STATE_CODE[s.slice(i + 2).trim()]
  return code ? `${s.slice(0, i)}, ${code}` : s
}

/** Build a ReferenceKey for a leg (Backhaul normalized to One Way). Empty if names missing. */
export function buildReferenceKey(
  origin: string | undefined,
  dest: string | undefined,
  eq: EquipmentSpec,
  operation: string,
  service: string,
): string {
  if (!origin || !dest) return ''
  const svc = service === 'Backhaul' ? 'One Way' : service
  return `${origin} - ${dest} ${eq.truckType} ${eq.trailer} ${eq.config} ${operation} ${svc} ${eq.driver}`.toUpperCase()
}
