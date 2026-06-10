const measure = ({ page }) =>
  Promise.all([
    (async () => {
      const navigationTimingJson = await page.evaluate(() =>
        JSON.stringify(performance.getEntriesByType('navigation'))
      );

      return JSON.parse(navigationTimingJson);
    })(),
    (async () => {
      const paintTimingJson = await page.evaluate(() => JSON.stringify(window.performance.getEntriesByType('paint')));
      const paintTiming = JSON.parse(paintTimingJson);

      return paintTiming;
    })(),
    (async () => {
      const largestContentfulPaint = await page.evaluate(
        () =>
          new Promise((innerResolve) => {
            new PerformanceObserver((l) => {
              const entries = l.getEntries();
              // the last entry is the largest contentful paint
              const largestPaintEntry = entries.at(-1);
              innerResolve(largestPaintEntry.startTime);
            }).observe({
              type: 'largest-contentful-paint',
              buffered: true
            });
          })
      );

      return largestContentfulPaint;
    })()
  ]).then(([navigationTiming, paintTiming, largestContentfulPaint]) => ({
    navigationTiming,
    paintTiming,
    largestContentfulPaint
  }));

const reportPerformanceHtml = (metrics, pageUrl) => {
  const { navigationTiming, paintTiming, largestContentfulPaint } = metrics;

  const nav = navigationTiming?.[0] || {};
  const fp = paintTiming?.find((e) => e.name === 'first-paint')?.startTime;
  const fcp = paintTiming?.find((e) => e.name === 'first-contentful-paint')?.startTime;
  const formatMs = (value) => (value !== undefined && value !== null ? `${Number(value).toFixed(2)} ms` : 'N/A');

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 16px; background: #0f172a; color: #f8fafc; border-radius: 8px; max-width: 480px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #1e293b;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: #38bdf8; font-size: 1rem; font-weight: 600; border-bottom: 1px solid #334155; padding-bottom: 8px;">
        Performance Metrics
      </h3>
      <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px; word-break: break-all; border-bottom: 1px solid #334155; padding-bottom: 8px;">
        ${pageUrl || 'Page'}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
        <thead>
          <tr style="border-bottom: 1px solid #334155; text-align: left;">
            <th style="padding: 6px 0; color: #94a3b8; font-weight: 500;">Metric</th>
            <th style="padding: 6px 0; text-align: right; color: #94a3b8; font-weight: 500;">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 0; color: #cbd5e1;">Response Start</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #e2e8f0;">${formatMs(nav.responseStart)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #cbd5e1;">DOM Interactive</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #cbd5e1;">${formatMs(nav.domInteractive)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #cbd5e1;">DOM Content Loaded</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #cbd5e1;">${formatMs(nav.domContentLoadedEventEnd)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #cbd5e1;">Load Event End</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #cbd5e1;">${formatMs(nav.loadEventEnd)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 6px 0; color: #cbd5e1;">Total Duration</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #cbd5e1;">${formatMs(nav.duration)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0 4px 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Key Milestones</td>
            <td></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #cbd5e1;">First Paint (FP)</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #10b981;">${formatMs(fp)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #cbd5e1;">First Contentful Paint (FCP)</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #10b981;">${formatMs(fcp)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #cbd5e1;">Largest Contentful Paint (LCP)</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #f59e0b;">${formatMs(largestContentfulPaint)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

export { measure, reportPerformanceHtml };
