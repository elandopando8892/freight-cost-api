export const KM_PER_MILE = 1.60934
export const MILES_PER_KM = 1 / KM_PER_MILE

export const kmToMiles = (km: number): number => km * MILES_PER_KM
export const milesToKm = (miles: number): number => miles * KM_PER_MILE
