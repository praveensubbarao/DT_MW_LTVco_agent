import { test as base, expect } from '@playwright/test';
import { AppActions } from '@/actions/AppActions';

type AppFixtures = { appActions: AppActions };

export const test = base.extend<AppFixtures>({
  appActions: async ({ page }, use, testInfo) => {
    await use(new AppActions(page, testInfo));
  },
});

export { expect };
