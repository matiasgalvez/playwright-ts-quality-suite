import { test, expect } from '../../src/fixtures';
import { products } from '../../src/data/userFactory';

test.describe('Basket', () => {
  // `session` logs in through the API and injects the token: fast, and keeps UI login
  // coverage in login.spec.ts instead of repeating it in every test.

  test('logged-in user adds a product from search results @smoke', async ({ session, searchPage, nav, basketPage, api }) => {
    await searchPage.open();

    await searchPage.addToBasket(products.appleJuice);

    await expect(searchPage.snackbar()).toContainText(`Placed ${products.appleJuice} into basket.`);
    await expect(nav.basketCount).toHaveText('1');

    await nav.openBasket();
    await expect(basketPage.row(products.appleJuice)).toBeVisible();

    // Cross-check the backend: the UI action really persisted.
    const basket = await api.basketOk(session);
    expect(basket.Products.map((p) => p.name)).toContain(products.appleJuice);
  });

  test('adding the same product twice increases its quantity', async ({ session, searchPage, api }) => {
    await searchPage.open();

    await searchPage.addToBasket(products.bananaJuice);
    await expect(searchPage.snackbar()).toContainText(`Placed ${products.bananaJuice} into basket.`);
    await searchPage.addToBasket(products.bananaJuice);
    await expect(searchPage.snackbar()).toContainText(`Added another ${products.bananaJuice} to basket.`);

    await expect
      .poll(async () => (await api.basketOk(session)).Products.find((p) => p.name === products.bananaJuice)?.BasketItem.quantity)
      .toBe(2);
  });

  test('items added through the API appear in the UI basket', async ({ session, api, basketPage }) => {
    const pomace = await api.productByName(products.applePomace);
    await api.addBasketItemOk(session, pomace.id, 3);

    await basketPage.open();

    await expect(basketPage.row(products.applePomace)).toContainText('3');
  });
});
