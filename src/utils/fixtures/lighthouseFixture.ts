import { test as base } from '@playwright/test';
import { runLighthouse } from '@/utils/lighthouse/runLighthouse';
import { DESKTOP_THRESHOLDS, MOBILE_THRESHOLDS, thresholdMsg } from '@/utils/lighthouse/lighthouseThresholds';

type LighthouseFixtures = {
  audit: (url: string) => Promise<void>;
  auditMobile: (url: string) => Promise<void>;
};

export const lighthouseTest = base.extend<LighthouseFixtures>({
  audit: async ({}, use, testInfo) => {
    const audit = async (url: string) => {
      const result = await runLighthouse(url, 'desktop');
      Object.entries(result.scores).forEach(([category, score]) => {
        const threshold = DESKTOP_THRESHOLDS[category as keyof typeof DESKTOP_THRESHOLDS] || 0;
        const msg = thresholdMsg(url, 'desktop', score, threshold);
        testInfo.annotations.push({ type: `lighthouse:desktop:${category}`, description: msg });
        if (score < threshold) {
          throw new Error(`Desktop ${category} score ${score} below threshold ${threshold}`);
        }
      });
      testInfo.attach(`lighthouse-desktop-report`, {
        body: Buffer.from(result.htmlReport),
        contentType: 'text/html',
      });
    };
    await use(audit);
  },

  auditMobile: async ({}, use, testInfo) => {
    const auditMobile = async (url: string) => {
      const result = await runLighthouse(url, 'mobile');
      Object.entries(result.scores).forEach(([category, score]) => {
        const threshold = MOBILE_THRESHOLDS[category as keyof typeof MOBILE_THRESHOLDS] || 0;
        const msg = thresholdMsg(url, 'mobile', score, threshold);
        testInfo.annotations.push({ type: `lighthouse:mobile:${category}`, description: msg });
        if (score < threshold) {
          throw new Error(`Mobile ${category} score ${score} below threshold ${threshold}`);
        }
      });
      testInfo.attach(`lighthouse-mobile-report`, {
        body: Buffer.from(result.htmlReport),
        contentType: 'text/html',
      });
    };
    await use(auditMobile);
  },
});
