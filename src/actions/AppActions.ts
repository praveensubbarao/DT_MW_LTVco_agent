import { Page, Locator, TestInfo } from '@playwright/test';
import { selfHeal } from '@/utils/selfHeal/selfHealingLocator';

export class AppActions {
  constructor(
    private readonly page: Page,
    private readonly testInfo?: TestInfo
  ) {}

  /**
   * Get the base URL from the current page context
   */
  getBaseURL(): string {
    const baseURL = (this.page.context() as any)._options?.baseURL;
    if (!baseURL) {
      throw new Error('baseURL not configured in page context');
    }
    return baseURL;
  }

  /**
   * Navigate to a page
   */
  async openPage(path: string = '/'): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Expect page is visible (loaded)
   */
  async expectPageIsVisible(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Assert page URL contains fragment
   */
  async expectPageUrlContains(fragment: string): Promise<void> {
    await this.page.waitForURL(new RegExp(fragment));
  }

  /**
   * Assert page body contains text
   */
  async expectPageBodyContains(text: string): Promise<void> {
    const body = this.page.locator('body');
    await body.getByText(text).first().waitFor({ state: 'visible' });
  }

  /**
   * Click a locator with 3-tier fallback strategy
   */
  private async clickLocator(locator: Locator): Promise<void> {
    try {
      // Tier 1: Standard click
      await locator.click();
    } catch {
      try {
        // Tier 2: Force click
        await locator.click({ force: true });
      } catch {
        // Tier 3: Element handle evaluate
        const handle = await locator.elementHandle();
        if (handle) {
          await handle.evaluate((el: HTMLElement) => el.click());
        } else {
          throw new Error('Failed to click locator - no element handle');
        }
      }
    }
  }

  /**
   * Get a self-healing locator if testInfo is available
   */
  private async getSelfHealingLocator(
    description: string,
    primary: (page: Page) => Locator
  ): Promise<Locator> {
    if (!this.testInfo) {
      return primary(this.page);
    }
    return selfHeal(this.page, this.testInfo, { description, primary });
  }
}
