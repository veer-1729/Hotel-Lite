import type { Hotel } from '@/lib/types';
import type { RequestContext } from '@/lib/observability/trace';
import { runSpan } from '@/lib/observability/trace';
import { isMockMode } from '@/lib/config/env';
import { HOTEL_CATALOG } from '@/lib/db/catalog';
import { getRecommendationsDb } from '@/lib/db/queries/hotels';

export type RecommendationParams = {
  limit?: number;
};

export async function getRecommendations(
  ctx: RequestContext,
  params: RecommendationParams
): Promise<Hotel[]> {
  return runSpan(ctx, 'recommendations.compute', async () => {
    const limit = Math.min(params.limit ?? 5, HOTEL_CATALOG.length);

    if (isMockMode()) {
      return [...HOTEL_CATALOG]
        .sort((a, b) => {
          const scoreA = a.rating * 10 - a.pricePerNight * 0.01;
          const scoreB = b.rating * 10 - b.pricePerNight * 0.01;
          return scoreB - scoreA;
        })
        .slice(0, limit);
    }

    return getRecommendationsDb(limit);
  });
}
