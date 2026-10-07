// Positions describe a UI scale, not percentiles or additional observed prices.
const finite = value => typeof value === 'number' && Number.isFinite(value);
export function hasContinuousScale(stats) {
  return [stats.minimum, stats.central, stats.maximum].every(finite)
    && stats.minimum < stats.central && stats.central < stats.maximum;
}
export function positionOf(value, stats) {
  if (!finite(value)) return null;
  if (hasContinuousScale(stats)) {
    if (value < stats.minimum || value > stats.maximum) return null;
    return value <= stats.central
      ? 50 * (value - stats.minimum) / (stats.central - stats.minimum)
      : 50 + 50 * (value - stats.central) / (stats.maximum - stats.central);
  }
  // Only exact known anchors can be located when a bound is missing.
  if (value === stats.central && finite(stats.central)) return 50;
  if (value === stats.minimum && finite(stats.minimum)) return 0;
  if (value === stats.maximum && finite(stats.maximum)) return 100;
  return null;
}
export function valueAt(position, stats) {
  if (!hasContinuousScale(stats) || !finite(position) || position < 0 || position > 100) return null;
  return position <= 50
    ? stats.minimum + (stats.central - stats.minimum) * position / 50
    : stats.central + (stats.maximum - stats.central) * (position - 50) / 50;
}
export function selectPosition(position, card) {
  const value = valueAt(position, card.statistics);
  if (value === null) return null;
  // Presets keep their exact pinned amounts, without formatting/rounding them.
  const mode = position === 0 ? 'LOW' : position === 50 ? 'CENTRAL' : position === 100 ? 'HIGH'
    : value === card.standard.value ? 'MARKSMAN' : 'MANUAL';
  return { mode, value, provisionalAccepted: false };
}
export function optionalManual(raw, anchor) {
  return String(raw).trim() === '' ? { ...anchor }
    : { mode: 'MANUAL', value: Number(raw), provisionalAccepted: false };
}
