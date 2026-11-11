import { test, expect } from '../../src/fixtures';
import { newUser } from '../../src/data/userFactory';

/**
 * Known security defects.
 *
 * Each test asserts the SECURE behavior. Juice Shop is intentionally vulnerable, so these
 * currently fail, and `test.fail()` records that as an expected failure (the suite stays green).
 * When a defect gets fixed, the test starts passing, Playwright reports "expected to fail but passed",
 * and the build goes red until someone removes the annotation and closes the issue.
 * That keeps known defects visible and tracked instead of deleted or skipped.
 *
 * Details and severity: docs/known-issues.md
 */
test.describe('Security regression checks @security', () => {
  test('SEC-01 login is not vulnerable to SQL injection @api', async ({ api }) => {
    test.fail(true, 'SEC-01: login query concatenates user input (docs/known-issues.md)');

    const res = await api.login("' OR 1=1--", 'irrelevant');

    expect(res.status(), 'SQL injection in email must not authenticate').toBe(401);
  });

  test('SEC-02 users cannot register themselves as admin @api', async ({ api }) => {
    test.fail(true, 'SEC-02: role is mass-assignable on registration (docs/known-issues.md)');

    const res = await api.register(newUser('mallory'), { role: 'admin' });
    const body = await res.json();

    expect(body.data?.role, 'client-supplied role must be ignored').toBe('customer');
  });

  test("SEC-03 a user cannot read another user's basket (IDOR) @api", async ({ api, user }) => {
    test.fail(true, 'SEC-03: basket endpoint does not check ownership (docs/known-issues.md)');

    const alice = await api.loginOk(user);
    const bobUser = newUser('bob');
    await api.registerOk(bobUser);
    const bob = await api.loginOk(bobUser);

    const res = await api.getBasket(bob.bid, alice.token);

    expect([401, 403, 404], "reading someone else's basket must be refused").toContain(res.status());
  });

  test('SEC-04 whoami never exposes the password hash @api', async ({ api, user }) => {
    test.fail(true, 'SEC-04: "fields" query param can select the password column (docs/known-issues.md)');

    const { token } = await api.loginOk(user);
    const res = await api.whoAmI(token, 'email,password');

    expect((await res.json()).user).not.toHaveProperty('password');
  });

  test('error responses do not leak stack traces @api', async ({ request }) => {
    // Malformed JSON body: the server should answer with a clean 4xx, not internals.
    const res = await request.post('/rest/user/login', {
      headers: { 'Content-Type': 'application/json' },
      data: '{"email": ',
    });

    const body = await res.text();
    expect(body).not.toMatch(/at \S+ \(.*:\d+:\d+\)/); // Node.js stack frame
    expect(body).not.toMatch(/node_modules/);
  });
});
