import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withObservability } from '@/lib/api/withObservability';
import { ensureConfigured } from '@/lib/api/ensureConfigured';
import { requireSession } from '@/lib/api/requireSession';
import { isMockMode } from '@/lib/config/env';
import { charge, type PaymentDeclineReason } from '@/lib/domain/payments';

const bodySchema = z.object({
  reservationId: z.string().min(1),
  cardLast4: z.string().length(4)
});

function statusForDecline(reason: PaymentDeclineReason): number {
  switch (reason) {
    case 'not_found':
      return 404;
    case 'forbidden':
      return 403;
    case 'amount_mismatch':
    case 'declined':
      return 402;
    default:
      return 402;
  }
}

function errorCodeForDecline(reason: PaymentDeclineReason): string {
  if (reason === 'amount_mismatch') {
    return 'amount_contract_mismatch';
  }
  return reason;
}

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
        return NextResponse.json(
          {
            error: errorCodeForDecline(outcome.reason),
            message: outcome.message
          },
          { status: statusForDecline(outcome.reason) }
        );
      }

      return NextResponse.json(outcome.payment);
    }
  );
}
