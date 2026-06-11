export const REQUIRED_ENV_KEYS = [
  'POSTGRES_URL',
  'AUTH_SECRET',
  'AUTH_GITHUB_ID',
  'AUTH_GITHUB_SECRET',
  'NEXTAUTH_URL'
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export class ConfigError extends Error {
  missing: RequiredEnvKey[];

  constructor(missing: RequiredEnvKey[]) {
    super(`Missing required environment variables: ${missing.join(', ')}`);
    this.name = 'ConfigError';
    this.missing = missing;
  }
}

export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === 'true';
}

export function getMissingEnvVars(
  keys: readonly string[] = REQUIRED_ENV_KEYS
): RequiredEnvKey[] {
  return keys.filter((key) => !process.env[key]?.trim()) as RequiredEnvKey[];
}

export function assertRealModeConfig(): void {
  if (isMockMode()) return;
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    throw new ConfigError(missing);
  }
}

export function getAuthConfigStatus(): Record<RequiredEnvKey, boolean> {
  return {
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL?.trim()),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET?.trim()),
    AUTH_GITHUB_ID: Boolean(process.env.AUTH_GITHUB_ID?.trim()),
    AUTH_GITHUB_SECRET: Boolean(process.env.AUTH_GITHUB_SECRET?.trim()),
    NEXTAUTH_URL: Boolean(process.env.NEXTAUTH_URL?.trim())
  };
}

export function isAuthConfigComplete(): boolean {
  const authKeys: RequiredEnvKey[] = [
    'AUTH_SECRET',
    'AUTH_GITHUB_ID',
    'AUTH_GITHUB_SECRET',
    'NEXTAUTH_URL'
  ];
  return getMissingEnvVars(authKeys).length === 0;
}

export function getDbPoolMax(): number | undefined {
  const raw = process.env.DB_POOL_MAX?.trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    return undefined;
  }
  return value;
}

export function getDbConfigStatus(): { DB_POOL_MAX: boolean } {
  return {
    DB_POOL_MAX: Boolean(process.env.DB_POOL_MAX?.trim())
  };
}

export class DbPoolConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DbPoolConfigError';
  }
}

export function assertDbPoolMaxConfig(): void {
  const raw = process.env.DB_POOL_MAX?.trim();
  if (!raw) return;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new DbPoolConfigError('DB_POOL_MAX must be a positive integer');
  }
}
