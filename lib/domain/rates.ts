import type { RateQuote } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { isMockMode } from '@/lib/config/env';
import { getHotelById } from './hotels';
import { getRatesDb } from '@/lib/db/queries/rates';
import { resolvePromo } from './promotions';

export type RatesParams = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  promoCode?: string;
};

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const diff = end - start;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function applyPromoToQuote(
  quote: RateQuote,
  promoCode?: string
): RateQuote {
  if (!promoCode) return quote;

  const promo = resolvePromo(promoCode);
  if (promo) {
    const discountAmount =
      Math.round(quote.total * promo.discount * 100) / 100;
    return {
      ...quote,
      total: Math.round(quote.total * (1 - promo.discount) * 100) / 100,
      promoCode,
      discountAmount
    };
  }

  return quote;
}

export async function getRates(
  ctx: RequestContext,
  params: RatesParams
): Promise<RateQuote | null> {
  return runSpan(ctx, 'rates.lookup', async () => {
    let quote: RateQuote | null;

    if (isMockMode()) {
      const hotel = await getHotelById(params.hotelId);
      if (!hotel) return null;

      const nights = nightsBetween(params.checkIn, params.checkOut);
      if (nights <= 0) return null;

      const guestMultiplier = 1 + Math.max(0, params.guests - 2) * 0.1;
      const total =
        Math.round(hotel.pricePerNight * nights * guestMultiplier * 100) / 100;

      quote = {
        hotelId: hotel.id,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        nights,
        total,
        currency: hotel.currency
      };
    } else {
      quote = await getRatesDb(params);
    }

    if (!quote) return null;
    return applyPromoToQuote(quote, params.promoCode);
  });
}
