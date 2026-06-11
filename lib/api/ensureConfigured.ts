import { NextResponse } from 'next/server';
import { DbPoolConfigError, assertRealModeConfig, assertDbPoolMaxConfig } from '@/lib/config/env';
import { handleConfigError } from './configResponse';

export function ensureConfigured(): NextResponse | null {
  try {
    assertRealModeConfig();
    assertDbPoolMaxConfig();
    return null;
  } catch (error) {
    if (error instanceof DbPoolConfigError) {
      return NextResponse.json(
        {
          error: 'misconfigured',
          message: error.message
        },
        { status: 503 }
      );
    }
    return handleConfigError(error);
  }
}
