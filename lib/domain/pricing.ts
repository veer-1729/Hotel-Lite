import { isMockMode } from '@/lib/config/env';
import { getRatesDb } from '@/lib/db/queries/rates';
import { getHotelById } from './hotels';

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const diff = end - start;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function guestMultiplier(guests: number): number {
  return 1 + Math.max(0, guests - 2) * 0.1;
}

export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function computeStayTotalCents(
  pricePerNight: number,
  nights: number,
  guests: number
): number {
  return roundToCents(pricePerNight * nights * guestMultiplier(guests));
}

export type StayPricingParams = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export async function computeCatalogTotalForStay(
  params: StayPricingParams
): Promise<number | null> {
  if (isMockMode()) {
    const hotel = await getHotelById(params.hotelId);
    if (!hotel) return null;

    const nights = nightsBetween(params.checkIn, params.checkOut);
    if (nights <= 0) return null;

    return computeStayTotalCents(hotel.pricePerNight, nights, params.guests);
  }

  const quote = await getRatesDb(params);
  if (!quote) return null;

  return roundToCents(quote.total);
}
