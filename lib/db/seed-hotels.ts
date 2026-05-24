import 'server-only';

import { eq } from 'drizzle-orm';
import { HOTEL_CATALOG } from './catalog';
import { getDb } from './index';
import { hotelRates, hotels } from './schema';

export async function seedHotelsAndRates(): Promise<{
  hotels: number;
  rates: number;
}> {
  const db = getDb();
  let ratesCount = 0;

  for (const hotel of HOTEL_CATALOG) {
    await db
      .insert(hotels)
      .values({
        id: hotel.id,
        name: hotel.name,
        city: hotel.city,
        country: hotel.country,
        rating: hotel.rating,
        pricePerNight: String(hotel.pricePerNight),
        currency: hotel.currency,
        amenities: hotel.amenities
      })
      .onConflictDoUpdate({
        target: hotels.id,
        set: {
          name: hotel.name,
          city: hotel.city,
          country: hotel.country,
          rating: hotel.rating,
          pricePerNight: String(hotel.pricePerNight),
          currency: hotel.currency,
          amenities: hotel.amenities
        }
      });

    const existingRates = await db
      .select()
      .from(hotelRates)
      .where(eq(hotelRates.hotelId, hotel.id))
      .limit(1);

    if (existingRates.length === 0) {
      await db.insert(hotelRates).values({
        hotelId: hotel.id,
        pricePerNight: String(hotel.pricePerNight),
        currency: hotel.currency,
        validFrom: null,
        validTo: null
      });
      ratesCount += 1;
    }
  }

  return { hotels: HOTEL_CATALOG.length, rates: ratesCount };
}
