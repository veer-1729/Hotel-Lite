#!/usr/bin/env node
/**
 * Save Playwright storage state after manual GitHub sign-in.
 */

import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { chromium } from 'playwright';

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

function loadConfig(): { baseUrl: string; authStatePath: string } {
  const baseUrl = process.env.BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    console.error('BASE_URL is required (e.g. https://simple-eval-sand.vercel.app)');
    process.exit(1);
  }

  const authStatePath = resolve(
    process.cwd(),
    process.env.AUTH_STATE_PATH ?? '.auth/user.json'
  );

  return { baseUrl, authStatePath };
}

async function main(): Promise<void> {
  const { baseUrl, authStatePath } = loadConfig();
  mkdirSync(dirname(authStatePath), { recursive: true });

  console.log(`Opening ${baseUrl}/login for GitHub sign-in…`);
  console.log('Complete sign-in in the browser window. Waiting for /reservations…');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(
    `${baseUrl}/login?callbackUrl=${encodeURIComponent('/reservations')}`,
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForURL('**/reservations**', { timeout: LOGIN_TIMEOUT_MS });
  await page.getByText('Signed in as').waitFor({ timeout: 30_000 });

  await context.storageState({ path: authStatePath });
  await browser.close();

  console.log(`Auth state saved to ${authStatePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
