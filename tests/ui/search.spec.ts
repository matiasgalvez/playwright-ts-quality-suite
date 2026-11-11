import { test, expect } from '../../src/fixtures';
import { products } from '../../src/data/userFactory';

test.describe('Product search', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open();
  });

  test('shows matching products for a search term @smoke', async ({ nav, searchPage, page }) => {
    await nav.search('apple');

    await expect(page).toHaveURL(/#\/search\?q=apple/);
    await expect(searchPage.searchValue).toHaveText('apple');
    await expect(searchPage.productName(products.appleJuice)).toBeVisible();
    await expect(searchPage.productName(products.applePomace)).toBeVisible();
  });

  test('every product the API finds is shown in the UI', async ({ nav, searchPage, api }) => {
    // The UI filters client-side across more fields than the API, so the API result
    // must be a subset of what the user sees. A missing product means a rendering or filter bug.
    const expected = (await api.searchOk('apple')).map((p) => p.name);
    expect(expected.length).toBeGreaterThan(0);

    await nav.search('apple');

    for (const name of expected) {
      await expect(searchPage.productName(name), name).toBeVisible();
    }
  });

  test('shows an empty state when nothing matches', async ({ nav, searchPage }) => {
    await nav.search('no-such-product-xyz');

    await expect(searchPage.noResults).toBeVisible();
    await expect(searchPage.productNames).toHaveCount(0);
  });

  test('SEC-05 search term is rendered as text, not HTML @security', async ({ nav, searchPage }) => {
    test.fail(true, 'SEC-05: search term is bound with bypassSecurityTrustHtml (reflected XSS, docs/known-issues.md)');

    await nav.search('<b>bold</b>');

    // A safe app shows the literal string; this one renders a real <b> element.
    await expect(searchPage.searchValue).toContainText('bold');
    await expect(searchPage.searchValue.locator('b'), 'user input must not become markup').toHaveCount(0);
  });
});
