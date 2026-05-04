import { mergeTests } from '@playwright/test';
import { test as baseTest, expect } from '@/utils/fixtures/baseTest';
import { lighthouseTest } from '@/utils/fixtures/lighthouseFixture';

export const test = mergeTests(baseTest, lighthouseTest);
export { expect };
