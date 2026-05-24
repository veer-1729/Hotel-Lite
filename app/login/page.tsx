import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { signIn } from '@/lib/auth';

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl ?? '/reservations';

  return (
    <div className="flex min-h-screen items-start justify-center p-8 md:items-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Hotel Lite uses GitHub via Auth.js. Sign in to create and pay for
            reservations.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <form
            action={async () => {
              'use server';
              await signIn('github', { redirectTo });
            }}
            className="w-full"
          >
            <Button className="w-full">Sign in with GitHub</Button>
          </form>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
