import { NextResponse } from 'next/server';
import { ConfigError } from '@/lib/config/env';

export function misconfiguredResponse(error: ConfigError): NextResponse {
  return NextResponse.json(
    {
      error: 'misconfigured',
      message: error.message,
      missing: error.missing
    },
    { status: 503 }
  );
}

export function handleConfigError(error: unknown): NextResponse | null {
  if (error instanceof ConfigError) {
    return misconfiguredResponse(error);
  }
  return null;
}
