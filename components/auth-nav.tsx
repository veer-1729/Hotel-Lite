import Link from 'next/link';
import { auth, signIn, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export async function AuthNav() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/login?callbackUrl=/reservations">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted-foreground sm:inline">
        {session.user.email ?? session.user.name}
      </span>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
