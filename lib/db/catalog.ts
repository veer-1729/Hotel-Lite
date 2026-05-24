import type { Hotel } from '@/lib/types';

export const HOTEL_CATALOG: Hotel[] = [
  {
    id: 'h1',
    name: 'Le Marais Boutique',
    city: 'Paris',
    country: 'France',
    rating: 4.6,
    pricePerNight: 189,
    currency: 'EUR',
    amenities: ['wifi', 'breakfast']
  },
  {
    id: 'h2',
    name: 'Riviera Bay Resort',
    city: 'Nice',
    country: 'France',
    rating: 4.4,
    pricePerNight: 210,
    currency: 'EUR',
    amenities: ['pool', 'spa', 'wifi']
  },
  {
    id: 'h3',
    name: 'Thames View Inn',
    city: 'London',
    country: 'UK',
    rating: 4.3,
    pricePerNight: 165,
    currency: 'GBP',
    amenities: ['wifi', 'gym']
  },
  {
    id: 'h4',
    name: 'Shinjuku Central Hotel',
    city: 'Tokyo',
    country: 'Japan',
    rating: 4.7,
    pricePerNight: 142,
    currency: 'JPY',
    amenities: ['wifi', 'onsen']
  },
  {
    id: 'h5',
    name: 'Brooklyn Loft Stay',
    city: 'New York',
    country: 'USA',
    rating: 4.2,
    pricePerNight: 245,
    currency: 'USD',
    amenities: ['wifi', 'workspace']
  },
  {
    id: 'h6',
    name: 'Barcelona Gothic House',
    city: 'Barcelona',
    country: 'Spain',
    rating: 4.5,
    pricePerNight: 132,
    currency: 'EUR',
    amenities: ['wifi', 'rooftop']
  },
  {
    id: 'h7',
    name: 'Lisbon Alfama Guesthouse',
    city: 'Lisbon',
    country: 'Portugal',
    rating: 4.8,
    pricePerNight: 98,
    currency: 'EUR',
    amenities: ['wifi', 'breakfast']
  },
  {
    id: 'h8',
    name: 'Sydney Harbour Suites',
    city: 'Sydney',
    country: 'Australia',
    rating: 4.6,
    pricePerNight: 220,
    currency: 'AUD',
    amenities: ['pool', 'wifi', 'harbour-view']
  }
];
