import type { Hotel } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { isMockMode } from '@/lib/config/env';
import { HOTEL_CATALOG } from '@/lib/db/catalog';
import {
  getHotelByIdDb,
  searchHotelsDb
} from '@/lib/db/queries/hotels';

export { HOTEL_CATALOG };

export type SearchParams = {
  city?: string;
  q?: string;
};

export async function searchHotels(
  ctx: RequestContext,
  params: SearchParams
): Promise<Hotel[]> {
  return runSpan(ctx, 'search.hotels', async () => {
    if (isMockMode()) {
      let results = [...HOTEL_CATALOG];
      if (params.city) {
        const city = params.city.toLowerCase();
        results = results.filter((h) => h.city.toLowerCase().includes(city));
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        results = results.filter(
          (h) =>
            h.name.toLowerCase().includes(q) ||
            h.city.toLowerCase().includes(q) ||
            h.country.toLowerCase().includes(q)
        );
      }
      return results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return searchHotelsDb(params);
  });
}

export async function getHotelById(hotelId: string): Promise<Hotel | null> {
  if (isMockMode()) {
    return HOTEL_CATALOG.find((h) => h.id === hotelId) ?? null;
  }
  return getHotelByIdDb(hotelId);
}
