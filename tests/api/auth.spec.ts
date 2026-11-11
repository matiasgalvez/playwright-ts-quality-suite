import { test, expect } from '../../src/fixtures';
import { newUser } from '../../src/data/userFactory';
import { RegisterResponse } from '../../src/schemas';
import { parse } from '../../src/api/JuiceShopClient';

test.describe('POST /api/Users (registration)', () => {
  test('creates a customer and never returns the password @smoke @api', async ({ api }) => {
    const user = newUser();
    const res = await api.register(user);

    expect(res.status()).toBe(201);
    const { data } = parse(RegisterResponse, await res.json()); // schema refuses password / totpSecret fields
    expect(data.email).toBe(user.email);
    expect(data.role).toBe('customer');
    expect(data.isActive).toBe(true);
  });

  test('rejects a duplicate email @api', async ({ api, user }) => {
    const res = await api.register(user);

    expect(res.status()).toBe(400);
    expect(await res.text()).toMatch(/unique/i);
  });

  test('rejects an empty email and password @api', async ({ api }) => {
    const res = await api.register({ email: '', password: '' });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('POST /rest/user/login', () => {
  test('returns a JWT and the user basket id for valid credentials @smoke @api', async ({ api, user }) => {
    const session = await api.loginOk(user); // validates JWT format and basket id via schema
    expect(session.email).toBe(user.email);
  });

  test('rejects a wrong password with 401 and a generic message @api', async ({ api, user }) => {
    const res = await api.login(user.email, `${user.password}-wrong`);

    expect(res.status()).toBe(401);
    // Same message for unknown email and wrong password, so attackers can't enumerate accounts.
    expect(await res.text()).toBe('Invalid email or password.');
  });

  test('gives the same response for an unknown email (no user enumeration) @api', async ({ api }) => {
    const res = await api.login('nobody@quality-suite.test', 'whatever');

    expect(res.status()).toBe(401);
    expect(await res.text()).toBe('Invalid email or password.');
  });
});

test.describe('GET /rest/user/whoami', () => {
  test('returns the logged-in user for a valid token @api', async ({ api, user }) => {
    const { token } = await api.loginOk(user);
    const me = await api.whoAmIOk(token);

    expect(me.email).toBe(user.email);
    expect(me).not.toHaveProperty('password');
  });

  test('returns an empty user without a token @api', async ({ api }) => {
    const res = await api.whoAmI();

    expect(res.status()).toBe(200);
    expect((await res.json()).user.email).toBeUndefined();
  });
});
