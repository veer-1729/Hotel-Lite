import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../index';
import { hotelRates, hotels } from '../schema';
import { mapHotel } from '../mappers';
import type { RateQuote } from '@/lib/types';

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const diff = end - start;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function getRatesDb(params: {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}): Promise<RateQuote | null> {
  const db = getDb();
  const hotelRows = await db
    .select()
    .from(hotels)
    .where(eq(hotels.id, params.hotelId));
  const hotelRow = hotelRows[0];
  if (!hotelRow) return null;

  const hotel = mapHotel(hotelRow);
  const nights = nightsBetween(params.checkIn, params.checkOut);
  if (nights <= 0) return null;

  const rateRows = await db
    .select()
    .from(hotelRates)
    .where(eq(hotelRates.hotelId, params.hotelId))
    .limit(1);
  const rateRow = rateRows[0];

  const pricePerNight = rateRow
    ? Number(rateRow.pricePerNight)
    : hotel.pricePerNight;
  const currency = rateRow?.currency ?? hotel.currency;

  const guestMultiplier = 1 + Math.max(0, params.guests - 2) * 0.1;
  const total =
    Math.round(pricePerNight * nights * guestMultiplier * 100) / 100;

  return {
    hotelId: hotel.id,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.guests,
    nights,
    total,
    currency
  };
}
