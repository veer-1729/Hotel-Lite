export function resolvePromo(code: string): { discount: number } | null {
  switch (code) {
    case 'WELCOME10':
      return { discount: 0.1 };
    default:
      return null;
  }
}
