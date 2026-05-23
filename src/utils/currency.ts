export const mxnToUsd = (mxn: number, fxRate: number): number => mxn / fxRate
export const usdToMxn = (usd: number, fxRate: number): number => usd * fxRate
export const round2 = (n: number): number => Math.round(n * 100) / 100
export const round4 = (n: number): number => Math.round(n * 10000) / 10000
