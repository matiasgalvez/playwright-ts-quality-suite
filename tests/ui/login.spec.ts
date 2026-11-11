import { test, expect } from '../../src/fixtures';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('registered user can log in @smoke', async ({ loginPage, user, page }) => {
    await loginPage.login(user.email, user.password);

    await expect(page).toHaveURL(/#\/search/);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('token')), { message: 'auth token stored' })
      .toBeTruthy();
  });

  test('shows a generic error for a wrong password', async ({ loginPage, user, page }) => {
    await loginPage.login(user.email, 'definitely-wrong-password');

    await expect(loginPage.errorMessage()).toBeVisible();
    await expect(page).toHaveURL(/#\/login/);
  });

  test('login button stays disabled until both fields are filled', async ({ loginPage }) => {
    await expect(loginPage.submit).toBeDisabled();

    await loginPage.email.fill('someone@quality-suite.test');
    await expect(loginPage.submit).toBeDisabled();

    await loginPage.password.fill('x');
    await expect(loginPage.submit).toBeEnabled();
  });
});
