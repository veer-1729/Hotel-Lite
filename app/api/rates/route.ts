import { NextResponse } from 'next/server';
import { withObservability } from '@/lib/api/withObservability';
import { ensureConfigured } from '@/lib/api/ensureConfigured';
import { getRates } from '@/lib/domain/rates';
import { InvalidPromoCodeError } from '@/lib/domain/promotions';

export async function GET(request: Request) {
  return withObservability(
    request,
    { route: '/api/rates', operation: 'rates.lookup' },
    async (ctx) => {
      const configError = ensureConfigured();
      if (configError) return configError;

      const { searchParams } = new URL(request.url);
      const hotelId = searchParams.get('hotelId');
      const checkIn = searchParams.get('checkIn');
      const checkOut = searchParams.get('checkOut');
      const guestsParam = searchParams.get('guests');
      const promoCode = searchParams.get('promoCode')?.trim() || undefined;

      if (!hotelId || !checkIn || !checkOut || !guestsParam) {
        return NextResponse.json(
          {
            error: 'bad_request',
            message: 'hotelId, checkIn, checkOut, and guests are required'
          },
          { status: 400 }
        );
      }

      const guests = Number(guestsParam);
      if (!Number.isFinite(guests) || guests < 1) {
        return NextResponse.json(
          { error: 'bad_request', message: 'guests must be a positive number' },
          { status: 400 }
        );
      }

      let quote;
      try {
        quote = await getRates(ctx, {
          hotelId,
          checkIn,
          checkOut,
          guests,
          promoCode
        });
      } catch (error) {
        if (error instanceof InvalidPromoCodeError) {
          return NextResponse.json(
            {
              error: 'invalid_promo_code',
              message: 'The promo code is not valid'
            },
            { status: 400 }
          );
        }
        throw error;
      }

      if (!quote) {
        return NextResponse.json(
          {
            error: 'not_found',
            message: 'Hotel not found or checkOut must be after checkIn'
          },
          { status: 404 }
        );
      }

      return NextResponse.json(quote);
    }
  );
}
