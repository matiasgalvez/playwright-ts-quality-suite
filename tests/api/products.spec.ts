import { test, expect } from '../../src/fixtures';
import { products } from '../../src/data/userFactory';

test.describe('GET /rest/products/search', () => {
  test('returns the full catalog for an empty query @smoke @api', async ({ api }) => {
    const catalog = await api.searchOk('');

    expect(catalog.length).toBeGreaterThan(20);
    const ids = catalog.map((p) => p.id);
    expect(new Set(ids).size, 'product ids must be unique').toBe(ids.length);
  });

  test('every product matches the contract @api', async ({ api }) => {
    // searchOk() validates each product with the Zod schema; this test makes that explicit.
    const catalog = await api.searchOk('');
    for (const p of catalog) {
      expect(p.deluxePrice, `${p.name}: deluxe price must not exceed regular price`).toBeLessThanOrEqual(p.price);
    }
  });

  test('filters by name or description, case-insensitive @api', async ({ api }) => {
    const results = await api.searchOk('APPLE');

    expect(results.map((p) => p.name)).toEqual(expect.arrayContaining([products.appleJuice, products.applePomace]));
    for (const p of results) {
      expect(`${p.name} ${p.description}`.toLowerCase()).toContain('apple');
    }
  });

  test('returns results sorted by name @api', async ({ api }) => {
    const names = (await api.searchOk('juice')).map((p) => p.name);
    // The database sorts by character code (SQLite BINARY collation), so "OWASP…" comes before "Orange…".
    // That is a minor UX finding, but it is the current contract, so it is what we assert.
    expect(names).toEqual([...names].sort());
  });

  test('returns an empty list, not an error, when nothing matches @api', async ({ api }) => {
    expect(await api.searchOk('no-such-product-xyz')).toEqual([]);
  });

  test('responds quickly enough for type-ahead search @api', async ({ api }) => {
    const started = Date.now();
    await api.searchOk('juice');
    // Coarse functional guard only; real latency targets live in the k6 suite (performance/).
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
