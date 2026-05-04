import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  'best-practices': number;
  seo: number;
}

export interface LighthouseResult {
  scores: LighthouseScores;
  htmlReport: string;
  jsonReport: string;
}

export async function runLighthouse(url: string, formFactor: 'desktop' | 'mobile'): Promise<LighthouseResult> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  try {
    const options = {
      logLevel: 'error' as const,
      output: ['html', 'json'] as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
      emulatedFormFactor: formFactor,
    };

    const runnerResult = await lighthouse(url, options);

    if (!runnerResult) {
      throw new Error('Lighthouse audit failed');
    }

    const lhr = runnerResult.lhr;
    const scores: LighthouseScores = {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      'best-practices': Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
    };

    return {
      scores,
      htmlReport: runnerResult.report[0] as string,
      jsonReport: runnerResult.report[1] as string,
    };
  } finally {
    await chrome.kill();
  }
}
