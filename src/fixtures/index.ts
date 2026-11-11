import { test as base, type Page } from '@playwright/test';
import { JuiceShopClient, type Session } from '../api/JuiceShopClient';
import { newUser, type UserCredentials } from '../data/userFactory';
import { BasketPage, LoginPage, NavBar, SearchResultsPage } from '../pages';

interface Fixtures {
  api: JuiceShopClient;
  /** A brand-new registered user, unique to this test. */
  user: UserCredentials;
  /** That user logged in through the API; token injected into the browser. Skips the UI login. */
  session: Session;
  nav: NavBar;
  searchPage: SearchResultsPage;
  loginPage: LoginPage;
  basketPage: BasketPage;
}

export const test = base.extend<Fixtures>({
  // Every page starts with the welcome banner and cookie notice dismissed,
  // so tests exercise the feature under test instead of fighting overlays.
  page: async ({ page, baseURL }, use) => {
    await page.context().addCookies([
      { name: 'welcomebanner_status', value: 'dismiss', url: baseURL! },
      { name: 'cookieconsent_status', value: 'dismiss', url: baseURL! },
      { name: 'language', value: 'en', url: baseURL! },
    ]);
    await use(page);
  },

  api: async ({ request }, use) => {
    await use(new JuiceShopClient(request));
  },

  user: async ({ api }, use) => {
    const user = newUser();
    await api.registerOk(user);
    await use(user);
  },

  session: async ({ api, user, page, baseURL }, use) => {
    const session = await api.loginOk(user);
    await injectSession(page, session, baseURL!);
    await use(session);
  },

  nav: async ({ page }, use) => use(new NavBar(page)),
  searchPage: async ({ page }, use) => use(new SearchResultsPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  basketPage: async ({ page }, use) => use(new BasketPage(page)),
});

/** Reproduces what the Juice Shop frontend stores after a successful login. */
async function injectSession(page: Page, session: Session, baseURL: string) {
  await page.context().addCookies([{ name: 'token', value: session.token, url: baseURL }]);
  await page.addInitScript(({ token, bid }) => {
    window.localStorage.setItem('token', token);
    window.sessionStorage.setItem('bid', String(bid));
  }, session);
}

export { expect } from '@playwright/test';
