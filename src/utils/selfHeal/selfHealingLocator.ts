import { Page, Locator, TestInfo } from '@playwright/test';
import { getDefaultProvider, HealResult, logHealAttempt } from '@/utils/selfHeal/llmProvider';

export interface SelfHealOptions {
  description: string;
  primary: (page: Page) => Locator;
  domSnapshotLimit?: number;
  timeout?: number;
  provider?: any;
}

/**
 * Self-healing locator with LLM fallback
 */
export async function selfHeal(page: Page, testInfo: TestInfo, options: SelfHealOptions): Promise<Locator> {
  const { description, primary, domSnapshotLimit = 8000, timeout = 10000 } = options;

  try {
    // Try primary locator
    const primaryLocator = primary(page);
    await primaryLocator.waitFor({ state: 'visible', timeout });
    return primaryLocator;
  } catch (error) {
    // Primary failed, try healing
    const provider = options.provider || getDefaultProvider();

    if (!provider) {
      // No provider, re-throw original error
      throw error;
    }

    try {
      // Snapshot DOM
      const domSnapshot = await page.evaluate((limit) => {
        const body = document.body.innerHTML;
        return body.substring(0, limit);
      }, domSnapshotLimit);

      // Call LLM to heal
      const healResult: HealResult = await provider.healSelector(description, domSnapshot);

      // Create healed locator
      const healedLocator = page.locator(healResult.selector);

      // Validate it's visible
      await healedLocator.waitFor({ state: 'visible', timeout });

      // Log success
      logHealAttempt(testInfo.title, description, healResult, true);
      testInfo.annotations.push({
        type: 'self-heal',
        description: `Healed selector: ${healResult.selector} (${healResult.confidence})`,
      });

      return healedLocator;
    } catch (healError) {
      logHealAttempt(testInfo.title, description, { selector: '', confidence: 'low', reasoning: 'healing failed' }, false);
      throw error; // Re-throw original error if healing fails
    }
  }
}
