import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import ReservationsClient from './reservations-client';

export default async function ReservationsPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/reservations');
  }

  if (!session.user.id) {
    redirect('/login?callbackUrl=/reservations');
  }

  return (
    <ReservationsClient
      user={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? ''
      }}
    />
  );
}
