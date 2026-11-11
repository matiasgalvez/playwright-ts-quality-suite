import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures';
import baseline from './a11y-baseline.json';

/**
 * Accessibility "ratchet".
 *
 * Existing violations are recorded in a11y-baseline.json (rule id per page) and tracked in
 * docs/known-issues.md. The test fails on any NEW rule violation, so accessibility can only get
 * better, without blocking the pipeline on legacy debt that the team has already triaged.
 * The full axe report is attached to every run.
 */
const pages: { name: keyof typeof baseline; path: string; ready: string }[] = [
  { name: 'search', path: '/#/search', ready: 'app-product .name' },
  { name: 'login', path: '/#/login', ready: '#loginButton' },
  { name: 'register', path: '/#/register', ready: '#registerButton' },
];

for (const { name, path, ready } of pages) {
  test(`${name} page has no new WCAG 2.1 AA violations`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.locator(ready).first().waitFor();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    await testInfo.attach(`axe-${name}.json`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });

    const known = new Set<string>(baseline[name]);
    const newViolations = results.violations
      .filter((v) => !known.has(v.id))
      .map((v) => `${v.id} (${v.impact}) — ${v.help} — ${v.nodes.length} element(s)`);

    expect(newViolations, `New accessibility violations on ${name}`).toEqual([]);

    const fixed = [...known].filter((id) => !results.violations.some((v) => v.id === id));
    if (fixed.length) {
      testInfo.annotations.push({ type: 'a11y-fixed', description: `Remove from baseline: ${fixed.join(', ')}` });
    }
  });
}
