/** Distance and time are alternative allocations of the same committed assets. */
export function allocateFixedCost(byDistance: number, byTime: number): number {
  return Math.max(byDistance, byTime)
}
