DO $$ BEGIN
  CREATE TYPE "reservation_status" AS ENUM('pending', 'confirmed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotels" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "country" text NOT NULL,
  "rating" real NOT NULL,
  "price_per_night" numeric(10, 2) NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "amenities" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_rates" (
  "id" serial PRIMARY KEY NOT NULL,
  "hotel_id" text NOT NULL,
  "price_per_night" numeric(10, 2) NOT NULL,
  "currency" text NOT NULL,
  "valid_from" date,
  "valid_to" date
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "hotel_rates" ADD CONSTRAINT "hotel_rates_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
  "id" text PRIMARY KEY NOT NULL,
  "hotel_id" text NOT NULL,
  "user_id" text NOT NULL,
  "user_email" text NOT NULL,
  "guest_name" text NOT NULL,
  "email" text NOT NULL,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "guests" integer NOT NULL,
  "total" numeric(10, 2) NOT NULL,
  "currency" text NOT NULL,
  "status" "reservation_status" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reservations" ADD CONSTRAINT "reservations_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
