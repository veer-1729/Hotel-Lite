import packageJson from '../../package.json';
import { isMockMode } from './env';

export const appName = 'Hotel Lite';

export function useMockData(): boolean {
  return isMockMode();
}

export function getAppVersion(): string {
  return packageJson.version ?? '0.0.0';
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development';
}
