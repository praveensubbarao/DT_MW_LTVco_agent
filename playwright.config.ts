import { defineConfig, devices } from '@playwright/test';

const envURL = (stack: string): string => {
  const urls: Record<string, string> = {
    dev: 'https://dev.ltvco.com/',
    stg: 'https://stg.ltvco.com/',    
    prod: 'https://www.ltvco.com/',
  };
  return urls[stack] || urls.prod;
};

const stack = process.env.STACK || 'prod';

export default defineConfig({
  testDir: 'src/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.WORKER_COUNT ? Number(process.env.WORKER_COUNT) : 2,
  reporter: [['list'], ['html'], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    baseURL: envURL(stack),
    headless: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure-and-retries',
    video: 'on',
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
  },
  timeout: 360_000,
  expect: {
    timeout: 10_000,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1350, height: 940 },
      },
    },
    {
      name: 'tablet-chrome',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'mobile-small',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
