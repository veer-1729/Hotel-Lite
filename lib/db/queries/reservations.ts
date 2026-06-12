import 'server-only';

import { desc, eq } from 'drizzle-orm';
import { getDb } from '../index';
import { hotels, reservations } from '../schema';
import { mapReservation } from '../mappers';
import type { Reservation } from '@/lib/types';

export type CreateReservationDbInput = {
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
  promoCode?: string | null;
};

export async function createReservationDb(
  input: CreateReservationDbInput
): Promise<Reservation | null> {
  const db = getDb();
  const hotelRows = await db
    .select()
    .from(hotels)
    .where(eq(hotels.id, input.hotelId));
  const hotelRow = hotelRows[0];
  if (!hotelRow) return null;

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(reservations)
    .values({
      id,
      hotelId: input.hotelId,
      userId: input.userId,
      userEmail: input.userEmail,
      guestName: input.guestName,
      email: input.email,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      total: String(input.total),
      currency: input.currency,
      ...(input.promoCode ? { promoCode: input.promoCode } : {}),
      status: 'confirmed'
    })
    .returning();

  return mapReservation(row, hotelRow.name);
}

export async function getReservationByIdDb(
  id: string
): Promise<Reservation | null> {
  const db = getDb();
  const rows = await db
    .select({
      reservation: reservations,
      hotelName: hotels.name
    })
    .from(reservations)
    .innerJoin(hotels, eq(reservations.hotelId, hotels.id))
    .where(eq(reservations.id, id));

  const row = rows[0];
  if (!row) return null;
  return mapReservation(row.reservation, row.hotelName);
}

export async function listReservationsByUserDb(
  userId: string
): Promise<Reservation[]> {
  const db = getDb();
  const rows = await db
    .select({
      reservation: reservations,
      hotelName: hotels.name
    })
    .from(reservations)
    .innerJoin(hotels, eq(reservations.hotelId, hotels.id))
    .where(eq(reservations.userId, userId))
    .orderBy(desc(reservations.createdAt));

  return rows.map((row) => mapReservation(row.reservation, row.hotelName));
}
