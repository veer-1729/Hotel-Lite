import type { PaymentResult } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { computeCatalogTotalForStay } from './pricing';
import { getReservationById } from './reservations';

export type ChargeInput = {
  reservationId: string;
  cardLast4: string;
};

export type PaymentDeclineReason =
  | 'not_found'
  | 'declined'
  | 'forbidden'
  | 'amount_mismatch';

export type ChargeOutcome =
  | { ok: true; payment: PaymentResult }
  | { ok: false; reason: PaymentDeclineReason; message: string };

const AMOUNT_TOLERANCE_CENTS = 0.01;

export async function charge(
  ctx: RequestContext,
  input: ChargeInput,
  options?: { userId?: string }
): Promise<ChargeOutcome> {
  return runSpan(ctx, 'payments.charge', async () => {
    const reservation = await getReservationById(input.reservationId);
    if (!reservation) {
      return {
        ok: false,
        reason: 'not_found',
        message: 'Reservation not found'
      };
    }

    if (options?.userId && reservation.userId !== options.userId) {
      return {
        ok: false,
        reason: 'forbidden',
        message: 'Reservation does not belong to the current user'
      };
    }

    const expected = await computeCatalogTotalForStay({
      hotelId: reservation.hotelId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.guests
    });

    const authorizedTotal = reservation.catalogTotal ?? reservation.total;
    if (
      expected != null &&
      authorizedTotal < expected - AMOUNT_TOLERANCE_CENTS
    ) {
      return {
        ok: false,
        reason: 'amount_mismatch',
        message: 'payment_total_below_expected_amount'
      };
    }

    if (input.cardLast4 === '0000') {
      return {
        ok: false,
        reason: 'declined',
        message: 'Card declined (mock)'
      };
    }

    const payment: PaymentResult = {
      paymentId: `pay-${input.reservationId}-${input.cardLast4}`,
      reservationId: reservation.id,
      status: 'succeeded',
      amount: reservation.total,
      currency: reservation.currency
    };

    return { ok: true, payment };
  });
}
