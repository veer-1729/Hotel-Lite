#!/usr/bin/env node
/**
 * External workload generator for Hotel Lite (incident-gym).
 * Standalone CLI — no Next.js imports.
 */

import { createWriteStream, mkdirSync, type WriteStream } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const USER_AGENT = 'incident-gym-workload/0.1';

const PUBLIC_BROWSE_STEPS = [
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/search?city=Paris' },
  { method: 'GET', path: '/api/recommendations?limit=5' },
  {
    method: 'GET',
    path: '/api/rates?hotelId=h1&checkIn=2026-06-01&checkOut=2026-06-03&guests=2'
  }
] as const;

const RATES_QUERY =
  '?hotelId=h1&checkIn=2026-06-01&checkOut=2026-06-03&guests=2';

type RequestStep = { method: string; path: string };

type RequestRecord = {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  latency_ms: number;
  success: boolean;
  request_id?: string;
};

type Config = {
  baseUrl: string;
  durationSeconds: number;
  concurrency: number;
  requestDelayMs: number;
  flow: string;
  targetEndpoint?: string;
  writeDebugLog: boolean;
};

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) {
    console.error(`Invalid ${name}: ${raw}`);
    process.exit(1);
  }
  return n;
}

function loadConfig(): Config {
  const baseUrl = process.env.BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    console.error('BASE_URL is required (e.g. https://simple-eval-sand.vercel.app)');
    process.exit(1);
  }

  return {
    baseUrl,
    durationSeconds: envInt('DURATION_SECONDS', 60),
    concurrency: Math.max(1, envInt('CONCURRENCY', 1)),
    requestDelayMs: envInt('REQUEST_DELAY_MS', 100),
    flow: process.env.FLOW ?? 'public_browse',
    targetEndpoint: process.env.TARGET_ENDPOINT?.trim() || undefined,
    writeDebugLog: process.env.WRITE_DEBUG_LOG !== 'false'
  };
}

function makeRunId(): string {
  const iso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const suffix = randomBytes(2).toString('hex');
  return `${iso}-${suffix}`;
}

function newRequestId(): string {
  return `workload-${randomBytes(8).toString('hex')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveSteps(config: Config): RequestStep[] {
  if (config.targetEndpoint) {
    let path = config.targetEndpoint;
    if (!path.startsWith('/')) path = `/${path}`;
    if (path.startsWith('/api/rates') && !path.includes('?')) {
      path += RATES_QUERY;
    }
    return [{ method: 'GET', path }];
  }

  if (config.flow === 'public_browse') {
    return [...PUBLIC_BROWSE_STEPS];
  }

  console.error(`Unknown FLOW: ${config.flow} (supported: public_browse)`);
  process.exit(1);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function executeRequest(
  baseUrl: string,
  step: RequestStep
): Promise<RequestRecord> {
  const url = `${baseUrl}${step.path}`;
  const requestId = newRequestId();
  const start = performance.now();

  let status = 0;
  let responseRequestId: string | undefined;

  try {
    const res = await fetch(url, {
      method: step.method,
      headers: {
        'User-Agent': USER_AGENT,
        'x-request-id': requestId
      }
    });
    status = res.status;
    responseRequestId = res.headers.get('x-request-id') ?? undefined;
  } catch {
    status = 0;
  }

  const latency_ms = Math.round(performance.now() - start);
  const success = status >= 200 && status < 300;

  return {
    timestamp: new Date().toISOString(),
    method: step.method,
    url,
    status,
    latency_ms,
    success,
    request_id: responseRequestId ?? requestId
  };
}

async function worker(
  config: Config,
  steps: RequestStep[],
  endAt: number,
  records: RequestRecord[],
  stepIndex: { value: number }
): Promise<void> {
  while (Date.now() < endAt) {
    const step = steps[stepIndex.value % steps.length];
    stepIndex.value += 1;

    const record = await executeRequest(config.baseUrl, step);
    records.push(record);

    if (Date.now() >= endAt) break;
    await sleep(config.requestDelayMs);
  }
}

function printProgress(records: RequestRecord[], label: string): void {
  const total = records.length;
  const failures = records.filter((r) => !r.success).length;
  const errorRate = total > 0 ? ((failures / total) * 100).toFixed(1) : '0.0';
  console.log(`[${label}] requests=${total} error_rate=${errorRate}%`);
}

function printSummary(
  config: Config,
  runId: string,
  records: RequestRecord[],
  startedAt: Date
): void {
  const total = records.length;
  const successes = records.filter((r) => r.success).length;
  const failures = total - successes;
  const errorRate = total > 0 ? ((failures / total) * 100).toFixed(2) : '0.00';
  const latencies = records.map((r) => r.latency_ms).sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);

  console.log('\n--- workload summary ---');
  console.log(`run_id:            ${runId}`);
  console.log(`base_url:          ${config.baseUrl}`);
  console.log(
    `flow:              ${config.targetEndpoint ?? config.flow}`
  );
  console.log(`duration_seconds:  ${config.durationSeconds}`);
  console.log(`concurrency:       ${config.concurrency}`);
  console.log(`request_delay_ms:  ${config.requestDelayMs}`);
  console.log(`total_requests:    ${total}`);
  console.log(`successes:         ${successes}`);
  console.log(`failures:          ${failures}`);
  console.log(`error_rate:        ${errorRate}%`);
  console.log(`latency_p50_ms:    ${p50}`);
  console.log(`latency_p95_ms:    ${p95}`);
  console.log(`started_at:        ${startedAt.toISOString()}`);
  console.log(`ended_at:          ${new Date().toISOString()}`);

  const failed = records.filter((r) => !r.success);
  if (failed.length > 0) {
    console.log('\n--- sample failures (max 10) ---');
    for (const r of failed.slice(0, 10)) {
      console.log(
        `  ${r.status} ${r.method} ${r.url} request_id=${r.request_id ?? 'n/a'}`
      );
    }
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const steps = resolveSteps(config);
  const runId = makeRunId();
  const startedAt = new Date();
  const endAt = Date.now() + config.durationSeconds * 1000;

  let debugStream: WriteStream | null = null;
  if (config.writeDebugLog) {
    const dir = join(process.cwd(), 'evidence', 'runs', runId);
    mkdirSync(dir, { recursive: true });
    debugStream = createWriteStream(join(dir, 'workload_debug.jsonl'));
    debugStream.write(
      JSON.stringify({
        type: 'run_metadata',
        run_id: runId,
        user_agent: USER_AGENT,
        request_delay_ms: config.requestDelayMs,
        base_url: config.baseUrl,
        duration_seconds: config.durationSeconds,
        concurrency: config.concurrency,
        flow: config.targetEndpoint ?? config.flow,
        started_at: startedAt.toISOString()
      }) + '\n'
    );
    console.log(`Debug log: evidence/runs/${runId}/workload_debug.jsonl`);
  }

  console.log(`Workload run ${runId}`);
  console.log(`Target: ${config.baseUrl}`);
  console.log(
    `Duration: ${config.durationSeconds}s | Concurrency: ${config.concurrency} | Delay: ${config.requestDelayMs}ms`
  );

  const records: RequestRecord[] = [];
  const stepIndex = { value: 0 };

  const progressInterval = setInterval(() => {
    printProgress(records, 'progress');
  }, 10_000);

  const workers = Array.from({ length: config.concurrency }, () =>
    worker(config, steps, endAt, records, stepIndex)
  );
  await Promise.all(workers);

  clearInterval(progressInterval);

  if (debugStream) {
    for (const r of records) {
      debugStream.write(JSON.stringify(r) + '\n');
    }
    debugStream.write(
      JSON.stringify({
        type: 'run_metadata',
        run_id: runId,
        ended_at: new Date().toISOString(),
        total_requests: records.length
      }) + '\n'
    );
    debugStream.end();
  }

  printSummary(config, runId, records, startedAt);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
