import { NextResponse } from 'next/server';
import { withObservability } from '@/lib/api/withObservability';
import { ensureConfigured } from '@/lib/api/ensureConfigured';
import { searchHotels } from '@/lib/domain/hotels';

export async function GET(request: Request) {
  return withObservability(
    request,
    { route: '/api/search', operation: 'search.hotels' },
    async (ctx) => {
      const configError = ensureConfigured();
      if (configError) return configError;

      const { searchParams } = new URL(request.url);
      const city = searchParams.get('city') ?? undefined;
      const q = searchParams.get('q') ?? undefined;

      const hotels = await searchHotels(ctx, { city, q });
      return NextResponse.json({ hotels });
    }
  );
}
