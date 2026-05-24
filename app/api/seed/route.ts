import { NextResponse } from 'next/server';
import { withObservability } from '@/lib/api/withObservability';
import { ensureConfigured } from '@/lib/api/ensureConfigured';
import { isMockMode } from '@/lib/config/env';
import { seedHotelsAndRates } from '@/lib/db/seed-hotels';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return withObservability(
    request,
    { route: '/api/seed', operation: 'seed.hotels' },
    async () => {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'forbidden', message: 'Seed is disabled in production' },
          { status: 403 }
        );
      }

      if (isMockMode()) {
        return NextResponse.json(
          {
            error: 'bad_request',
            message: 'Seed requires real database mode (unset USE_MOCK_DATA)'
          },
          { status: 400 }
        );
      }

      const configError = ensureConfigured();
      if (configError) return configError;

      const result = await seedHotelsAndRates();
      return NextResponse.json({
        message: 'Seeded hotels and rates',
        ...result
      });
    }
  );
}
