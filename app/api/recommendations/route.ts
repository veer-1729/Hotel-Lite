import { NextResponse } from 'next/server';
import { withObservability } from '@/lib/api/withObservability';
import { ensureConfigured } from '@/lib/api/ensureConfigured';
import { getRecommendations } from '@/lib/domain/recommendations';

export async function GET(request: Request) {
  return withObservability(
    request,
    { route: '/api/recommendations', operation: 'recommendations.compute' },
    async (ctx) => {
      const configError = ensureConfigured();
      if (configError) return configError;

      const { searchParams } = new URL(request.url);
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? Number(limitParam) : undefined;

      const recommendations = await getRecommendations(ctx, { limit });
      return NextResponse.json({ recommendations });
    }
  );
}
