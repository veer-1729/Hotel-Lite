'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import type { Hotel } from '@/lib/types';

export default function SearchPage() {
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [recommendations, setRecommendations] = useState<Hotel[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (q) params.set('q', q);

    try {
      const res = await fetch(`/api/search?${params.toString()}`, {
        headers: { 'x-request-id': crypto.randomUUID() }
      });
      setRequestId(res.headers.get('x-request-id'));
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setHotels(data.hotels ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadRecommendations() {
      const res = await fetch('/api/recommendations?limit=4', {
        headers: { 'x-request-id': crypto.randomUUID() }
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations ?? []);
      }
    }
    loadRecommendations();
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Search hotels</h1>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Keyword"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {requestId && (
        <p className="mt-2 text-xs text-muted-foreground">
          Last request id: {requestId}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold">Results ({hotels.length})</h2>
          {hotels.map((hotel) => (
            <Card key={hotel.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{hotel.name}</CardTitle>
                <CardDescription>
                  {hotel.city}, {hotel.country} · ★ {hotel.rating}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                From {hotel.pricePerNight} {hotel.currency}/night ·{' '}
                {hotel.amenities.join(', ')}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">Recommended</h2>
          {recommendations.map((hotel) => (
            <Card key={`rec-${hotel.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{hotel.name}</CardTitle>
                <CardDescription>{hotel.city}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
