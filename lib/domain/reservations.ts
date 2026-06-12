import type { Reservation } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { isMockMode } from '@/lib/config/env';
import { getHotelById } from './hotels';
import {
  createReservationDb,
  getReservationByIdDb,
  getReservationWithHotel,
  listReservationsByUserDb
} from '@/lib/db/queries/reservations';

const mockReservations = new Map<string, Reservation>();

export type CreateReservationInput = {
  hotelId: string;
  userId: string;
  userEmail: string;
  guestName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency: string;
};

export async function createReservation(
  ctx: RequestContext,
  input: CreateReservationInput
): Promise<Reservation | null> {
  return runSpan(ctx, 'reservations.create', async () => {
    if (isMockMode()) {
      const hotel = await getHotelById(input.hotelId);
      if (!hotel) return null;

      const id = `res-${mockReservations.size + 1}-${input.hotelId}`;
      const reservation: Reservation = {
        id,
        hotelId: hotel.id,
        hotelName: hotel.name,
        userId: input.userId,
        guestName: input.guestName,
        email: input.email,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests,
        total: input.total,
        currency: input.currency,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      mockReservations.set(id, reservation);
      return reservation;
    }

    return createReservationDb(input);
  });
}

export async function getReservationById(
  id: string
): Promise<Reservation | null> {
  if (isMockMode()) {
    return mockReservations.get(id) ?? null;
  }
  return getReservationByIdDb(id);
}

export async function listReservationsByUser(
  userId: string
): Promise<Reservation[]> {
  if (isMockMode()) {
    return Array.from(mockReservations.values()).filter(
      (r) => r.userId === userId
    );
  }
  return listReservationsByUserDb(userId);
}

export async function getReservationForUser(
  id: string,
  userId: string
): Promise<Reservation | null> {
  const reservation = await getReservationById(id);
  if (!reservation) return null;
  if (reservation.userId !== userId) return null;
  return reservation;
}

function formatConfirmationDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export async function getReservationForConfirmation(id: string) {
  if (isMockMode()) {
    return null;
  }

  const record = await getReservationWithHotel(id);
  if (!record) {
    return null;
  }

  return {
    hotelName: record.hotelName,
    formattedCheckIn: formatConfirmationDate(String(record.reservation.checkIn)),
    formattedCheckOut: formatConfirmationDate(String(record.reservation.checkOut))
  };
}
