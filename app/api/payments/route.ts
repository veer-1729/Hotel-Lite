import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withObservability } from '@/lib/api/withObservability';
import { ensureConfigured } from '@/lib/api/ensureConfigured';
import { requireSession } from '@/lib/api/requireSession';
import { isMockMode } from '@/lib/config/env';
import { charge } from '@/lib/domain/payments';

const bodySchema = z.object({
  reservationId: z.string().min(1),
  cardLast4: z.string().length(4)
});

export async function POST(request: Request) {
  return withObservability(
    request,
    { route: '/api/payments', operation: 'payments.charge' },
    async (ctx) => {
      const configError = ensureConfigured();
      if (configError) return configError;

      let userId: string | undefined;
      if (!isMockMode()) {
        const sessionResult = await requireSession();
        if (!sessionResult.ok) return sessionResult.response;
        userId = sessionResult.user.id;
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: 'bad_request', message: 'Invalid JSON body' },
          { status: 400 }
        );
      }

      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'bad_request',
            message: parsed.error.errors.map((e) => e.message).join('; ')
          },
          { status: 400 }
        );
      }

      const outcome = await charge(ctx, parsed.data, { userId });

      if (!outcome.ok) {
        const status =
          outcome.reason === 'not_found'
            ? 404
            : outcome.reason === 'forbidden'
              ? 403
              : 402;
        return NextResponse.json(
          { error: outcome.reason, message: outcome.message },
          { status }
        );
      }

      return NextResponse.json({ ...outcome.payment });
    }
  );
}
