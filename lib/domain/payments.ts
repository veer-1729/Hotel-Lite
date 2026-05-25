import type { PaymentResult } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { getReservationById } from './reservations';

export type ChargeInput = {
  reservationId: string;
  cardLast4: string;
};

export type ChargeOutcome =
  | { ok: true; payment: PaymentResult }
  | { ok: false; reason: 'not_found' | 'declined' | 'forbidden'; message: string };

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

    if (input.cardLast4 === '0000') {
      return {
        ok: false,
        reason: 'declined',
        message: 'Card declined (mock)'
      };
    }

    const captureRef = (
      reservation as unknown as { billingRef: { captureId: string } }
    ).billingRef.captureId;

    const payment: PaymentResult = {
      paymentId: `pay-${captureRef}-${input.cardLast4}`,
      reservationId: reservation.id,
      status: 'succeeded',
      amount: reservation.total,
      currency: reservation.currency
    };

    return { ok: true, payment };
  });
}
