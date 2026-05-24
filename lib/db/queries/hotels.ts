import 'server-only';

import { and, eq, ilike, or } from 'drizzle-orm';
import { getDb } from '../index';
import { hotels } from '../schema';
import { mapHotel } from '../mappers';
import type { Hotel } from '@/lib/types';

export async function searchHotelsDb(params: {
  city?: string;
  q?: string;
}): Promise<Hotel[]> {
  const db = getDb();
  const conditions = [];

  if (params.city) {
    conditions.push(ilike(hotels.city, `%${params.city}%`));
  }

  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push(
      or(
        ilike(hotels.name, pattern),
        ilike(hotels.city, pattern),
        ilike(hotels.country, pattern)
      )
    );
  }

  const query = db.select().from(hotels);
  const rows =
    conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(hotels.name)
      : await query.orderBy(hotels.name);

  return rows.map(mapHotel);
}

export async function getHotelByIdDb(hotelId: string): Promise<Hotel | null> {
  const db = getDb();
  const rows = await db.select().from(hotels).where(eq(hotels.id, hotelId));
  const row = rows[0];
  return row ? mapHotel(row) : null;
}

export async function getRecommendationsDb(limit: number): Promise<Hotel[]> {
  const db = getDb();
  const rows = await db.select().from(hotels);
  return rows
    .map(mapHotel)
    .sort((a, b) => {
      const scoreA = a.rating * 10 - a.pricePerNight * 0.01;
      const scoreB = b.rating * 10 - b.pricePerNight * 0.01;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}
