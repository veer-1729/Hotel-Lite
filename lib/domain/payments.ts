import type { PaymentResult } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { isMockMode } from '@/lib/config/env';
import type { SelectReservation } from '@/lib/db/schema';
import { getReservationWithHotel } from '@/lib/db/queries/reservations';
import { getReservationById, getReservationForConfirmation } from './reservations';

export type ChargeInput = {
  reservationId: string;
  cardLast4: string;
};

export type ChargeOutcome =
  | { ok: true; payment: PaymentResult }
  | { ok: false; reason: 'not_found' | 'declined' | 'forbidden'; message: string };

function buildPaymentConfirmation(
  reservation: SelectReservation,
  hotelName: string,
  paymentId: string
): PaymentResult {
  return {
    paymentId,
    reservationId: reservation.id,
    status: 'succeeded',
    amount: Number(reservation.total),
    currency: reservation.currency,
    confirmationId: reservation.id.slice(0, 8).toUpperCase(),
    totalPaid: (reservation.total as unknown as number).toFixed(2),
    hotelName,
    checkIn: String(reservation.checkIn),
    checkOut: String(reservation.checkOut),
    confirmationStatus: 'confirmed'
  };
}

export async function charge(
  ctx: RequestContext,
  input: ChargeInput,
  options?: { userId?: string }
): Promise<ChargeOutcome> {
  return runSpan(ctx, 'payments.charge', async () => {
    if (isMockMode()) {
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

      const payment: PaymentResult = {
        paymentId: `pay-${input.reservationId}-${input.cardLast4}`,
        reservationId: reservation.id,
        status: 'succeeded',
        amount: reservation.total,
        currency: reservation.currency
      };

      return { ok: true, payment };
    }

    const record = await getReservationWithHotel(input.reservationId);
    if (!record) {
      return {
        ok: false,
        reason: 'not_found',
        message: 'Reservation not found'
      };
    }

    const { reservation, hotelName } = record;

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

    await getReservationForConfirmation(input.reservationId);

    const paymentId = `pay-${input.reservationId}-${input.cardLast4}`;
    const payment = buildPaymentConfirmation(
      reservation,
      hotelName,
      paymentId
    );

    return { ok: true, payment };
  });
}
