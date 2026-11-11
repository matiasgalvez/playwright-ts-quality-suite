import { test, expect } from '../../src/fixtures';
import { newUser, products } from '../../src/data/userFactory';

test.describe('Basket API', () => {
  test('adds a product to the user basket @smoke @api', async ({ api, user }) => {
    const session = await api.loginOk(user);
    const juice = await api.productByName(products.appleJuice);

    const item = await api.addBasketItemOk(session, juice.id, 2);
    expect(item).toMatchObject({ ProductId: juice.id, BasketId: session.bid, quantity: 2 });

    const basket = await api.basketOk(session);
    const line = basket.Products.find((p) => p.id === juice.id);
    expect(line, 'product should be in the basket').toBeDefined();
    expect(line!.BasketItem.quantity).toBe(2);
  });

  test('a new user starts with an empty basket @api', async ({ api, user }) => {
    const basket = await api.basketOk(await api.loginOk(user));
    expect(basket.Products).toEqual([]);
  });

  test('requires authentication to read a basket @api', async ({ api, user }) => {
    const { bid } = await api.loginOk(user);
    const res = await api.getBasket(bid);
    expect(res.status()).toBe(401);
  });

  test('requires authentication to add items @api', async ({ request }) => {
    const res = await request.post('/api/BasketItems', { data: { ProductId: 1, BasketId: 1, quantity: 1 } });
    expect(res.status()).toBe(401);
  });

  test("rejects adding items to another user's basket @api", async ({ api, user }) => {
    const alice = await api.loginOk(user);
    const bobUser = newUser('bob');
    await api.registerOk(bobUser);
    const bob = await api.loginOk(bobUser);

    const res = await api.addBasketItem(alice.token, bob.bid, 1, 1);

    expect(res.status()).toBe(401);
    expect((await api.basketOk(bob)).Products).toEqual([]);
  });
});
