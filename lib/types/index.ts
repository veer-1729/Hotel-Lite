export type Hotel = {
  id: string;
  name: string;
  city: string;
  country: string;
  rating: number;
  pricePerNight: number;
  currency: string;
  amenities: string[];
};

export type RateQuote = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  total: number;
  currency: string;
};

export type Reservation = {
  id: string;
  hotelId: string;
  hotelName: string;
  userId?: string;
  guestName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed';
  createdAt: string;
};

export type PaymentResult = {
  paymentId: string;
  reservationId: string;
  status: 'succeeded' | 'declined';
  amount: number;
  currency: string;
};

export type ApiError = {
  error: string;
  message: string;
};

export type HealthCheckStatus = 'ok' | 'skipped' | 'error' | 'misconfigured';

export type HealthResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  mockMode: boolean;
  app: string;
  timestamp: string;
  version: string;
  nodeEnv: string;
  checks: {
    app: { status: 'ok' };
    database: {
      status: HealthCheckStatus;
      latency_ms?: number;
      message?: string;
      pool?: {
        total: number;
        idle: number;
        waiting: number;
      };
    };
    auth: {
      status: HealthCheckStatus;
      configured: Record<string, boolean>;
      message?: string;
    };
  };
};
