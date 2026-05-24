#!/usr/bin/env node
/**
 * Authenticated booking workload via Playwright (search → reserve → pay).
 */

import { createWriteStream, existsSync, mkdirSync, type WriteStream } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';
import { chromium, type Page, type BrowserContext } from 'playwright';
import {
  VARIANT_MATRIX_VERSION,
  VARIANT_COUNT,
  delayForAttempt,
  variantForAttempt,
  type BookingVariant
} from './booking-variants';

const USER_AGENT = 'incident-gym-workload-auth/0.1';

type BookingAttemptRecord = {
  attemptIndex: number;
  hotelId: string;
  guests: number;
  stayLength: number;
  checkIn: string;
  checkOut: string;
  success: boolean;
  latency_ms: number;
  request_ids: Record<string, string>;
  error?: string;
  timestamp: string;
};

type Config = {
  baseUrl: string;
  authStatePath: string;
  durationSeconds: number;
  concurrency: number;
  requestDelayMsMin: number;
  requestDelayMsMax: number;
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

  const authStatePath = resolve(
    process.cwd(),
    process.env.AUTH_STATE_PATH ?? '.auth/user.json'
  );

  if (!existsSync(authStatePath)) {
    console.error(`Auth state not found at ${authStatePath}`);
    console.error('Run: BASE_URL=... npm run auth:save-state');
    process.exit(1);
  }

  const requestDelayMsMin = envInt('REQUEST_DELAY_MS_MIN', 500);
  const requestDelayMsMax = envInt('REQUEST_DELAY_MS_MAX', 1500);

  if (requestDelayMsMin < 500) {
    console.error('REQUEST_DELAY_MS_MIN must be at least 500');
    process.exit(1);
  }
  if (requestDelayMsMax < requestDelayMsMin) {
    console.error('REQUEST_DELAY_MS_MAX must be >= REQUEST_DELAY_MS_MIN');
    process.exit(1);
  }

  return {
    baseUrl,
    authStatePath,
    durationSeconds: envInt('DURATION_SECONDS', 60),
    concurrency: Math.max(1, envInt('CONCURRENCY', 1)),
    requestDelayMsMin,
    requestDelayMsMax,
    writeDebugLog: process.env.WRITE_DEBUG_LOG === 'true'
  };
}

function makeRunId(): string {
  const iso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const suffix = randomBytes(2).toString('hex');
  return `${iso}-${suffix}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function attachApiTracking(page: Page, requestIds: Record<string, string>): void {
  page.on('response', (response) => {
    const url = new URL(response.url());
    const rid = response.headers()['x-request-id'];
    if (!rid) return;

    if (url.pathname === '/api/rates') requestIds.rates = rid;
    if (url.pathname === '/api/reservations' && response.request().method() === 'GET') {
      requestIds.reservations_list = rid;
    }
    if (url.pathname === '/api/reservations' && response.request().method() === 'POST') {
      requestIds.reservations_create = rid;
    }
    if (url.pathname === '/api/payments') requestIds.payments = rid;
  });
}

function hotelSelect(page: Page) {
  return page.locator('label').filter({ hasText: 'Hotel' }).locator('select');
}

/** Wait until reservations page has populated the hotel select (client fetch finished). */
async function waitForHotelsLoaded(page: Page): Promise<void> {
  await page.getByRole('heading', { name: 'Book a stay' }).waitFor({ timeout: 30_000 });

  const option = hotelSelect(page).locator('option[value]:not([value=""])').first();
  try {
    await option.waitFor({ state: 'attached', timeout: 30_000 });
  } catch {
    const hint = await page
      .locator('p')
      .filter({ hasText: /Could not|failed|error/i })
      .first()
      .textContent()
      .catch(() => null);
    throw new Error(
      hint
        ? `Hotel select empty: ${hint.trim()}`
        : 'Hotel select empty after 30s — seed the deployed database or check /api/search'
    );
  }
}

async function selectHotel(page: Page, preferredId: string): Promise<string> {
  const select = hotelSelect(page);
  const options = await select.locator('option[value]:not([value=""])').all();
  const values: string[] = [];
  for (const opt of options) {
    const v = await opt.getAttribute('value');
    if (v) values.push(v);
  }

  if (values.includes(preferredId)) {
    await select.selectOption(preferredId);
    return preferredId;
  }

  const fallback = values[0];
  if (!fallback) {
    throw new Error('No hotels in select after /api/search completed');
  }
  await select.selectOption(fallback);
  return fallback;
}

async function runBookingAttempt(
  page: Page,
  baseUrl: string,
  variant: BookingVariant
): Promise<{ success: boolean; error?: string; request_ids: Record<string, string> }> {
  const requestIds: Record<string, string> = {};
  attachApiTracking(page, requestIds);

  await page.goto(`${baseUrl}/search`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Search hotels' }).waitFor({ timeout: 30_000 });

  await page.goto(`${baseUrl}/reservations`, { waitUntil: 'domcontentloaded' });
  await waitForHotelsLoaded(page);

  const hotelId = await selectHotel(page, variant.hotelId);

  await page.getByLabel('Check-in').fill(variant.checkIn);
  await page.getByLabel('Check-out').fill(variant.checkOut);
  await page.getByLabel('Guests').fill(String(variant.guests));

  await page.getByRole('button', { name: 'Get rates' }).click();
  await page.getByText(/night\(s\):/).waitFor({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Create reservation' }).click();
  await page
    .getByText(/Reservation created|Reservation r-/)
    .waitFor({ timeout: 20_000 });

  await page.locator('input[maxlength="4"]').fill('4242');

  await page.getByRole('button', { name: 'Pay now' }).click();
  await page.getByText('Payment succeeded').waitFor({ timeout: 20_000 });

  const listRes = await page.request.get(`${baseUrl}/api/reservations`);
  const listRid = listRes.headers()['x-request-id'];
  if (listRid) requestIds.reservations_list_verify = listRid;

  if (!listRes.ok()) {
    return {
      success: false,
      error: `GET /api/reservations returned ${listRes.status()}`,
      request_ids: requestIds
    };
  }

  let body: { reservations?: unknown[] };
  try {
    body = (await listRes.json()) as { reservations?: unknown[] };
  } catch {
    return {
      success: false,
      error: 'GET /api/reservations response body unavailable',
      request_ids: requestIds
    };
  }
  if (!body.reservations?.length) {
    return {
      success: false,
      error: 'GET /api/reservations returned empty list',
      request_ids: requestIds
    };
  }

  if (hotelId !== variant.hotelId) {
    requestIds.hotel_fallback = hotelId;
  }

  return { success: true, request_ids: requestIds };
}

async function worker(
  config: Config,
  context: BrowserContext,
  endAt: number,
  records: BookingAttemptRecord[],
  allocAttemptIndex: () => number
): Promise<void> {
  const page = await context.newPage();

  while (Date.now() < endAt) {
    const attemptIndex = allocAttemptIndex();
    const variant = variantForAttempt(attemptIndex);
    const start = performance.now();
    const request_ids: Record<string, string> = {};

    let success = false;
    let error: string | undefined;

    try {
      const result = await runBookingAttempt(page, config.baseUrl, variant);
      Object.assign(request_ids, result.request_ids);
      success = result.success;
      error = result.error;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    records.push({
      attemptIndex,
      hotelId: variant.hotelId,
      guests: variant.guests,
      stayLength: variant.stayLength,
      checkIn: variant.checkIn,
      checkOut: variant.checkOut,
      success,
      latency_ms: Math.round(performance.now() - start),
      request_ids,
      error,
      timestamp: new Date().toISOString()
    });

    if (Date.now() >= endAt) break;

    const delay = delayForAttempt(
      attemptIndex,
      config.requestDelayMsMin,
      config.requestDelayMsMax
    );
    await sleep(delay);
  }

  await page.close();
}

function printProgress(records: BookingAttemptRecord[]): void {
  const total = records.length;
  const failures = records.filter((r) => !r.success).length;
  const errorRate = total > 0 ? ((failures / total) * 100).toFixed(1) : '0.0';
  console.log(`[progress] attempts=${total} error_rate=${errorRate}%`);
}

function printSummary(
  config: Config,
  runId: string,
  records: BookingAttemptRecord[],
  startedAt: Date
): void {
  const total = records.length;
  const successes = records.filter((r) => r.success).length;
  const failures = total - successes;
  const errorRate = total > 0 ? ((failures / total) * 100).toFixed(2) : '0.00';
  const latencies = records.map((r) => r.latency_ms).sort((a, b) => a - b);

  console.log('\n--- authenticated workload summary ---');
  console.log(`run_id:                 ${runId}`);
  console.log(`base_url:               ${config.baseUrl}`);
  console.log(`duration_seconds:       ${config.durationSeconds}`);
  console.log(`concurrency:            ${config.concurrency}`);
  console.log(`request_delay_ms_min:   ${config.requestDelayMsMin}`);
  console.log(`request_delay_ms_max:   ${config.requestDelayMsMax}`);
  console.log(`variant_matrix:         v${VARIANT_MATRIX_VERSION} (${VARIANT_COUNT} combos)`);
  console.log(`total_attempts:         ${total}`);
  console.log(`successes:              ${successes}`);
  console.log(`failures:               ${failures}`);
  console.log(`error_rate:             ${errorRate}%`);
  console.log(`latency_p50_ms:         ${percentile(latencies, 50)}`);
  console.log(`latency_p95_ms:         ${percentile(latencies, 95)}`);
  console.log(`started_at:             ${startedAt.toISOString()}`);
  console.log(`ended_at:               ${new Date().toISOString()}`);

  const failed = records.filter((r) => !r.success);
  if (failed.length > 0) {
    console.log('\n--- sample failures (max 10) ---');
    for (const r of failed.slice(0, 10)) {
      const ids = Object.entries(r.request_ids)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      console.log(
        `  attempt=${r.attemptIndex} hotel=${r.hotelId} checkIn=${r.checkIn} checkOut=${r.checkOut} guests=${r.guests} stayLength=${r.stayLength} error=${r.error ?? 'unknown'} ${ids}`
      );
    }
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const runId = makeRunId();
  const startedAt = new Date();
  const endAt = Date.now() + config.durationSeconds * 1000;

  let debugStream: WriteStream | null = null;
  if (config.writeDebugLog) {
    const dir = join(process.cwd(), 'evidence', 'runs', runId);
    mkdirSync(dir, { recursive: true });
    debugStream = createWriteStream(join(dir, 'auth_workload_debug.jsonl'));
    debugStream.write(
      JSON.stringify({
        type: 'run_metadata',
        run_id: runId,
        user_agent: USER_AGENT,
        variant_matrix_version: VARIANT_MATRIX_VERSION,
        variant_count: VARIANT_COUNT,
        request_delay_ms_min: config.requestDelayMsMin,
        request_delay_ms_max: config.requestDelayMsMax,
        base_url: config.baseUrl,
        duration_seconds: config.durationSeconds,
        concurrency: config.concurrency,
        started_at: startedAt.toISOString()
      }) + '\n'
    );
    console.log(`Debug log: evidence/runs/${runId}/auth_workload_debug.jsonl`);
  }

  console.log(`Authenticated workload ${runId}`);
  console.log(`Target: ${config.baseUrl}`);
  console.log(
    `Duration: ${config.durationSeconds}s | Concurrency: ${config.concurrency} | Delay: ${config.requestDelayMsMin}-${config.requestDelayMsMax}ms`
  );

  const records: BookingAttemptRecord[] = [];
  let attemptCounter = 0;
  const allocAttemptIndex = () => attemptCounter++;

  const browser = await chromium.launch({ headless: true });
  const contexts = await Promise.all(
    Array.from({ length: config.concurrency }, () =>
      browser.newContext({
        storageState: config.authStatePath,
        extraHTTPHeaders: { 'User-Agent': USER_AGENT }
      })
    )
  );

  const progressInterval = setInterval(() => printProgress(records), 10_000);

  await Promise.all(
    contexts.map((ctx) => worker(config, ctx, endAt, records, allocAttemptIndex))
  );

  clearInterval(progressInterval);
  await browser.close();

  if (debugStream) {
    for (const r of records) {
      debugStream.write(JSON.stringify(r) + '\n');
    }
    debugStream.write(
      JSON.stringify({
        type: 'run_metadata',
        run_id: runId,
        ended_at: new Date().toISOString(),
        total_attempts: records.length
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
