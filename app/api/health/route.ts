import { NextResponse } from 'next/server';
import { withObservability } from '@/lib/api/withObservability';
import { appName, getAppVersion, getNodeEnv } from '@/lib/config/runtime';
import {
  getAuthConfigStatus,
  isAuthConfigComplete,
  isMockMode
} from '@/lib/config/env';
import { pingDatabase, getPoolStats } from '@/lib/db';
import type { HealthResponse } from '@/lib/types';

export async function GET(request: Request) {
  return withObservability(
    request,
    { route: '/api/health', operation: 'health.check' },
    async () => {
      const mockMode = isMockMode();

      if (mockMode) {
        const body: HealthResponse = {
          status: 'healthy',
          mockMode: true,
          app: appName,
          timestamp: new Date().toISOString(),
          version: getAppVersion(),
          nodeEnv: getNodeEnv(),
          checks: {
            app: { status: 'ok' },
            database: { status: 'skipped', message: 'USE_MOCK_DATA=true' },
            auth: { status: 'skipped', configured: getAuthConfigStatus() }
          }
        };
        return NextResponse.json(body);
      }

      const authConfigured = getAuthConfigStatus();
      const authOk = isAuthConfigComplete();

      let databaseStatus: HealthResponse['checks']['database'] = {
        status: 'error',
        message: 'Database check not run'
      };

      try {
        const ping = await pingDatabase();
        const pool = getPoolStats();
        databaseStatus = {
          status: 'ok',
          latency_ms: ping.latencyMs,
          pool: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
          }
        };
      } catch (error) {
        databaseStatus = {
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Database unreachable'
        };
      }

      const authStatus = authOk
        ? { status: 'ok' as const, configured: authConfigured }
        : {
            status: 'misconfigured' as const,
            configured: authConfigured,
            message: 'Missing required auth environment variables'
          };

      let status: HealthResponse['status'] = 'healthy';
      if (databaseStatus.status === 'error' && authStatus.status === 'ok') {
        status = 'degraded';
      }
      if (databaseStatus.status === 'error' && authStatus.status !== 'ok') {
        status = 'unhealthy';
      }
      if (databaseStatus.status === 'ok' && authStatus.status !== 'ok') {
        status = 'unhealthy';
      }

      const body: HealthResponse = {
        status,
        mockMode: false,
        app: appName,
        timestamp: new Date().toISOString(),
        version: getAppVersion(),
        nodeEnv: getNodeEnv(),
        checks: {
          app: { status: 'ok' },
          database: databaseStatus,
          auth: authStatus
        }
      };

      return NextResponse.json(body, {
        status: status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503
      });
    }
  );
}
