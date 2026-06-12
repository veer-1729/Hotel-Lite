export function resolvePromo(code: string): { discount: number } | null {
  if (code === 'WELCOME10') return { discount: 0.1 };
  return null;
}
