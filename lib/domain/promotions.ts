export type ResolvedPromo =
  | { valid: true; code: string; discountPercent: number }
  | { valid: false };

export function resolvePromo(code: string | undefined): ResolvedPromo {
  if (!code) {
    return { valid: false };
  }

  const normalized = code.trim().toUpperCase();
  if (normalized === '') {
    return { valid: false };
  }

  if (normalized === 'WELCOME10') {
    return { valid: true, code: normalized, discountPercent: 10 };
  }

  return { valid: false };
}

export class InvalidPromoCodeError extends Error {
  constructor(public readonly code: string) {
    super(`Promo code is not valid: ${code}`);
    this.name = 'InvalidPromoCodeError';
  }
}
