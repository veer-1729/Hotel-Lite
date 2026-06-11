import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withObservability } from '@/lib/api/withObservability';
import { ensureConfigured } from '@/lib/api/ensureConfigured';
import { requireSession } from '@/lib/api/requireSession';
import {
  createReservation,
  listReservationsByUser
} from '@/lib/domain/reservations';

const bodySchema = z.object({
  hotelId: z.string().min(1),
  guestName: z.string().min(1),
  email: z.string().email(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().int().positive(),
  total: z.number().positive(),
  currency: z.string().min(1)
});

export async function GET(request: Request) {
  return withObservability(
    request,
    { route: '/api/reservations', operation: 'reservations.list' },
    async (ctx) => {
      const configError = ensureConfigured();
      if (configError) return configError;

      const sessionResult = await requireSession();
      if (!sessionResult.ok) return sessionResult.response;

      const reservations = await listReservationsByUser(sessionResult.user.id);
      return NextResponse.json({ reservations });
    }
  );
}

export async function POST(request: Request) {
  return withObservability(
    request,
    { route: '/api/reservations', operation: 'reservations.create' },
    async (ctx) => {
      const configError = ensureConfigured();
      if (configError) return configError;

      const sessionResult = await requireSession();
      if (!sessionResult.ok) return sessionResult.response;

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

      const reservation = await createReservation(ctx, {
        ...parsed.data,
        userId: sessionResult.user.id,
        userEmail: sessionResult.user.email
      });

      if (!reservation) {
        return NextResponse.json(
          { error: 'not_found', message: 'Hotel not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { reservation: { ...reservation } },
        { status: 201 }
      );
    }
  );
}
