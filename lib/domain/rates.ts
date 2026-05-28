import type { RateQuote } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { isMockMode } from '@/lib/config/env';
import { getHotelById } from './hotels';
import { getRatesDb } from '@/lib/db/queries/rates';
import {
  computeStayTotalCents,
  nightsBetween,
  roundToCents
} from './pricing';
import { InvalidPromoCodeError, resolvePromo } from './promotions';

export type RatesParams = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  promoCode?: string;
};

function applyPromoToQuote(
  quote: RateQuote,
  promoCode: string | undefined
): RateQuote {
  const trimmed = promoCode?.trim();
  if (!trimmed) {
    return quote;
  }

  const promo = resolvePromo(trimmed);
  if (!promo.valid) {
    throw new InvalidPromoCodeError(trimmed);
  }

  const subtotal = roundToCents(quote.total);
  const discountAmount = roundToCents(subtotal * (promo.discountPercent / 100));
  const total = roundToCents(subtotal - discountAmount);

  return {
    ...quote,
    subtotal,
    discountAmount,
    promoCode: promo.code,
    total
  };
}

async function buildMockQuote(params: RatesParams): Promise<RateQuote | null> {
  const hotel = await getHotelById(params.hotelId);
  if (!hotel) return null;

  const nights = nightsBetween(params.checkIn, params.checkOut);
  if (nights <= 0) return null;

  const total = computeStayTotalCents(
    hotel.pricePerNight,
    nights,
    params.guests
  );

  return {
    hotelId: hotel.id,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.guests,
    nights,
    total,
    currency: hotel.currency
  };
}

export async function getRates(
  ctx: RequestContext,
  params: RatesParams
): Promise<RateQuote | null> {
  return runSpan(ctx, 'rates.lookup', async () => {
    let quote: RateQuote | null;

    if (isMockMode()) {
      quote = await buildMockQuote(params);
    } else {
      quote = await getRatesDb(params);
    }

    if (!quote) return null;

    return applyPromoToQuote(quote, params.promoCode);
  });
}
