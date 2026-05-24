/**
 * Deterministic booking input matrix for authenticated workload (v1).
 */

export const VARIANT_MATRIX_VERSION = '1';

export const HOTEL_IDS = ['h1', 'h2', 'h3'] as const;
export const GUEST_COUNTS = [1, 2, 3, 4] as const;
export const STAY_LENGTHS = [1, 2, 3] as const;
export const CHECK_IN_DATES = [
  '2026-06-01',
  '2026-06-08',
  '2026-06-15',
  '2026-06-22',
  '2026-06-29',
  '2026-07-06',
  '2026-07-13'
] as const;

export type BookingVariant = {
  hotelId: string;
  guests: number;
  stayLength: number;
  checkIn: string;
  checkOut: string;
};

export const VARIANT_COUNT =
  HOTEL_IDS.length *
  GUEST_COUNTS.length *
  STAY_LENGTHS.length *
  CHECK_IN_DATES.length;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Stable mixed-radix index: checkIn cycles fastest, hotelId slowest. */
export function variantForAttempt(attemptIndex: number): BookingVariant {
  const idx = ((attemptIndex % VARIANT_COUNT) + VARIANT_COUNT) % VARIANT_COUNT;

  const checkInIdx = idx % CHECK_IN_DATES.length;
  let rest = Math.floor(idx / CHECK_IN_DATES.length);
  const stayIdx = rest % STAY_LENGTHS.length;
  rest = Math.floor(rest / STAY_LENGTHS.length);
  const guestsIdx = rest % GUEST_COUNTS.length;
  const hotelIdx = Math.floor(rest / GUEST_COUNTS.length);

  const stayLength = STAY_LENGTHS[stayIdx];
  const checkIn = CHECK_IN_DATES[checkInIdx];

  return {
    hotelId: HOTEL_IDS[hotelIdx],
    guests: GUEST_COUNTS[guestsIdx],
    stayLength,
    checkIn,
    checkOut: addDays(checkIn, stayLength)
  };
}

export function delayForAttempt(
  attemptIndex: number,
  minMs: number,
  maxMs: number
): number {
  const span = maxMs - minMs + 1;
  return minMs + (attemptIndex % span);
}
