import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type SessionResult =
  | { ok: true; user: SessionUser; session: Session }
  | { ok: false; response: NextResponse };

export async function requireSession(): Promise<SessionResult> {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;

  if (!id || !email) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'unauthorized',
          message: 'Sign in required'
        },
        { status: 401 }
      )
    };
  }

  const provider = 'github';
  const providerId = `${provider}_${id}`;

  return {
    ok: true,
    user: {
      id: providerId,
      email,
      name: session.user?.name
    },
    session: {
      ...session,
      user: { ...session.user, id: providerId }
    }
  };
}
