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
import type { Hotel, RateQuote, Reservation, PaymentResult } from '@/lib/types';

const defaultCheckIn = '2026-06-01';
const defaultCheckOut = '2026-06-03';

function requestHeaders(): HeadersInit {
  return { 'x-request-id': crypto.randomUUID() };
}

export type ReservationsUser = {
  id: string;
  email: string;
  name: string;
};

export default function ReservationsClient({ user }: { user: ReservationsUser }) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [guestName, setGuestName] = useState(user.name || 'Guest');
  const [email, setEmail] = useState(user.email);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(2);
  const [promoCode, setPromoCode] = useState('');
  const [cardLast4, setCardLast4] = useState('4242');
  const [quote, setQuote] = useState<RateQuote | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  function clearQuote() {
    setQuote(null);
  }

  async function loadMyReservations(retry = false) {
    const res = await fetch('/api/reservations', {
      headers: requestHeaders(),
      credentials: 'same-origin'
    });
    setRequestId(res.headers.get('x-request-id'));

    if (res.status === 401 && !retry) {
      await new Promise((r) => setTimeout(r, 400));
      return loadMyReservations(true);
    }

    if (res.status === 401) {
      setMessage(
        'Could not load reservations. Try signing out and back in, then refresh.'
      );
      setMyReservations([]);
      return;
    }

    const data = await res.json();
    if (res.ok) {
      setMyReservations(data.reservations ?? []);
    } else {
      setMessage(data.message ?? 'Could not load reservations');
    }
  }

  useEffect(() => {
    fetch('/api/search', { headers: requestHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setHotels(d.hotels ?? []);
        if (d.hotels?.[0]) setHotelId(d.hotels[0].id);
      });
    loadMyReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRates() {
    setMessage(null);
    const params = new URLSearchParams({
      hotelId,
      checkIn,
      checkOut,
      guests: String(guests)
    });
    const trimmedPromo = promoCode.trim();
    if (trimmedPromo) {
      params.set('promoCode', trimmedPromo);
    }
    const res = await fetch(`/api/rates?${params}`, {
      headers: requestHeaders()
    });
    setRequestId(res.headers.get('x-request-id'));
    const data = await res.json();
    if (!res.ok) {
      setQuote(null);
      setMessage(data.message ?? 'Could not fetch rates');
      return;
    }
    setQuote(data);
  }

  async function createReservation() {
    if (!quote) {
      setMessage('Fetch rates first');
      return;
    }
    setMessage(null);
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...requestHeaders()
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        hotelId,
        guestName,
        email,
        checkIn,
        checkOut,
        guests,
        total: quote.total,
        currency: quote.currency
      })
    });
    setRequestId(res.headers.get('x-request-id'));
    const data = await res.json();
    if (res.status === 401) {
      setMessage('Session expired. Sign out and sign in again.');
      return;
    }
    if (!res.ok) {
      setMessage(data.message ?? 'Reservation failed');
      return;
    }
    setReservation(data.reservation);
    setPayment(null);
    setMessage('Reservation saved. Complete mock payment below.');
    loadMyReservations();
  }

  async function pay() {
    if (!reservation) {
      setMessage('Create a reservation first');
      return;
    }
    setMessage(null);
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...requestHeaders()
      },
      credentials: 'same-origin',
      body: JSON.stringify({ reservationId: reservation.id, cardLast4 })
    });
    setRequestId(res.headers.get('x-request-id'));
    const data = await res.json();
    if (res.status === 401) {
      setMessage('Session expired. Sign out and sign in again.');
      return;
    }
    if (!res.ok) {
      setPayment(null);
      setMessage(data.message ?? 'Payment failed');
      return;
    }
    setPayment(data);
    setMessage('Payment succeeded.');
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Book a stay</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as {user.email}. Rates → reservation → mock payment (card{' '}
        <code className="text-xs">0000</code> declines).
      </p>

      {myReservations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your reservations</CardTitle>
            <CardDescription>Persisted bookings for your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {myReservations.map((r) => (
              <div key={r.id} className="rounded border p-2">
                <p className="font-medium">
                  {r.hotelName} — {r.id}
                </p>
                <p className="text-muted-foreground">
                  {r.checkIn} → {r.checkOut} · {r.total} {r.currency}
                  {r.status ? ` · ${r.status}` : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Stay details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block text-sm">
            Hotel
            <select
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={hotelId}
              onChange={(e) => {
                setHotelId(e.target.value);
                clearQuote();
              }}
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              Check-in
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  clearQuote();
                }}
              />
            </label>
            <label className="text-sm">
              Check-out
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  clearQuote();
                }}
              />
            </label>
          </div>
          <label className="text-sm">
            Guests
            <Input
              type="number"
              min={1}
              value={guests}
              onChange={(e) => {
                setGuests(Number(e.target.value));
                clearQuote();
              }}
            />
          </label>
          <label className="text-sm">
            Promo code
            <Input
              value={promoCode}
              placeholder="Optional"
              onChange={(e) => {
                setPromoCode(e.target.value);
                clearQuote();
              }}
            />
          </label>
          <Button type="button" onClick={fetchRates}>
            Get rates
          </Button>
          {quote && (
            <div className="space-y-1 text-sm">
              <p>
                {quote.nights} night(s) · {quote.currency}
              </p>
              {quote.discountAmount != null && quote.subtotal != null ? (
                <>
                  <p className="text-muted-foreground">
                    Subtotal: {quote.subtotal} {quote.currency}
                  </p>
                  <p className="text-muted-foreground">
                    Discount ({quote.promoCode}): −{quote.discountAmount}{' '}
                    {quote.currency}
                  </p>
                  <p className="font-medium">
                    Total: {quote.total} {quote.currency}
                  </p>
                </>
              ) : (
                <p className="font-medium">
                  Total: {quote.total} {quote.currency}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Guest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="button" onClick={createReservation}>
            Create reservation
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Mock payment</CardTitle>
          <CardDescription>Last 4 digits of card</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            maxLength={4}
            value={cardLast4}
            onChange={(e) => setCardLast4(e.target.value)}
          />
          <Button type="button" onClick={pay}>
            Pay now
          </Button>
        </CardContent>
      </Card>

      {requestId && (
        <p className="mt-4 text-xs text-muted-foreground">Request id: {requestId}</p>
      )}
      {message && <p className="mt-2 text-sm">{message}</p>}
      {reservation && (
        <p className="mt-2 text-sm text-green-700">
          Reservation {reservation.id} at {reservation.hotelName}
        </p>
      )}
      {payment && (
        <p className="mt-2 text-sm text-green-700">
          Payment {payment.paymentId} — {payment.status}
        </p>
      )}
    </main>
  );
}
