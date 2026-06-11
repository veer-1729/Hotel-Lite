export const PROMO_REGISTRY: Record<string, { discount: number }> = {
  WELCOME_10: { discount: 0.1 }
};

export function resolvePromo(code: string): { discount: number } | null {
  return PROMO_REGISTRY[code] ?? null;
}
