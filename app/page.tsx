import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Plan your stay</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Milestone 1B: search and book with Postgres-backed data and GitHub
        sign-in. Set <code className="text-sm">USE_MOCK_DATA=true</code> only
        for local in-memory fallback.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Search hotels</CardTitle>
            <CardDescription>Browse the catalog by city or keyword.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/search">Go to search</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Book a stay</CardTitle>
            <CardDescription>
              Sign in, view rates, reserve (Postgres), and pay (mock).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/reservations">Start booking</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
