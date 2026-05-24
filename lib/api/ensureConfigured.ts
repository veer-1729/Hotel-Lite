import { NextResponse } from 'next/server';
import { assertRealModeConfig } from '@/lib/config/env';
import { handleConfigError } from './configResponse';

export function ensureConfigured(): NextResponse | null {
  try {
    assertRealModeConfig();
    return null;
  } catch (error) {
    return handleConfigError(error);
  }
}
