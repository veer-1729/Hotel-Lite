import type { Hotel, Reservation } from '@/lib/types';
import type { SelectHotel, SelectReservation } from './schema';

export function mapHotel(row: SelectHotel): Hotel {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    rating: row.rating,
    pricePerNight: Number(row.pricePerNight),
    currency: row.currency,
    amenities: row.amenities
  };
}

export function mapReservation(
  row: SelectReservation,
  hotelName: string
): Reservation {
  return {
    id: row.id,
    hotelId: row.hotelId,
    hotelName,
    userId: row.userId,
    guestName: row.guestName,
    email: row.email,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    guests: row.guests,
    total: Number(row.total),
    currency: row.currency,
    status: row.status,
    createdAt: row.createdAt.toISOString()
  };
}
