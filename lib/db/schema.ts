import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  serial,
  real,
  jsonb,
  date
} from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  name: text('name').notNull(),
  status: statusEnum('status').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull(),
  availableAt: timestamp('available_at').notNull()
});

export const hotels = pgTable('hotels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  rating: real('rating').notNull(),
  pricePerNight: numeric('price_per_night', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  amenities: jsonb('amenities').$type<string[]>().notNull()
});

export const hotelRates = pgTable('hotel_rates', {
  id: serial('id').primaryKey(),
  hotelId: text('hotel_id')
    .notNull()
    .references(() => hotels.id),
  pricePerNight: numeric('price_per_night', {
    precision: 10,
    scale: 2
  }).notNull(),
  currency: text('currency').notNull(),
  validFrom: date('valid_from'),
  validTo: date('valid_to')
});

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed'
]);

export const reservations = pgTable('reservations', {
  id: text('id').primaryKey(),
  hotelId: text('hotel_id')
    .notNull()
    .references(() => hotels.id),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  guestName: text('guest_name').notNull(),
  email: text('email').notNull(),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  guests: integer('guests').notNull(),
  // Postgres NUMERIC is returned as string by the driver/Drizzle.
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  status: reservationStatusEnum('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export type SelectProduct = typeof products.$inferSelect;
export type SelectHotel = typeof hotels.$inferSelect;
export type SelectReservation = typeof reservations.$inferSelect;
