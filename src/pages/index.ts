import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page objects expose user intent (search, login, addToBasket) and page state.
 * Business-rule assertions stay in the test files.
 */

export class NavBar {
  readonly searchToggle: Locator;
  readonly searchInput: Locator;
  readonly basketButton: Locator;
  readonly basketCount: Locator;
  readonly accountButton: Locator;

  constructor(private readonly page: Page) {
    this.searchToggle = page.locator('#searchQuery');
    this.searchInput = page.locator('#searchQuery input');
    this.basketButton = page.getByRole('button', { name: 'Show the shopping cart' });
    this.basketCount = this.basketButton.locator('.fa-layers-counter');
    this.accountButton = page.locator('#navbarAccount');
  }

  async search(term: string) {
    await this.searchToggle.click();
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  async openBasket() {
    await this.basketButton.click();
    await expect(this.page).toHaveURL(/#\/basket/);
  }
}

export class SearchResultsPage {
  readonly searchValue: Locator;
  readonly productNames: Locator;
  readonly noResults: Locator;

  constructor(private readonly page: Page) {
    this.searchValue = page.locator('#searchValue');
    this.productNames = page.locator('app-product .name');
    this.noResults = page.getByText('No results found');
  }

  async open() {
    await this.page.goto('/#/search');
    await expect(this.productNames.first()).toBeVisible();
  }

  /** Exact match: `hasText` alone is a case-insensitive substring ("Apple Juice" would also match "Pineapple Juice"). */
  productName(name: string): Locator {
    return this.productNames.filter({ hasText: exact(name) });
  }

  productCard(name: string): Locator {
    return this.page.locator('app-product').filter({ has: this.page.locator('.name', { hasText: exact(name) }) });
  }

  async addToBasket(name: string) {
    await this.productCard(name).locator('.btn-basket').click();
  }

  snackbar(): Locator {
    return this.page.locator('simple-snack-bar, .mat-mdc-snack-bar-label').first();
  }
}

function exact(text: string): RegExp {
  return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.email = page.locator('#email');
    this.password = page.locator('#password');
    this.submit = page.locator('#loginButton');
  }

  async open() {
    await this.page.goto('/#/login');
    await expect(this.submit).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  errorMessage(): Locator {
    return this.page.getByText('Invalid email or password.');
  }
}

export class BasketPage {
  readonly rows: Locator;
  readonly checkoutButton: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.locator('mat-row, tr.mat-mdc-row');
    this.checkoutButton = page.locator('#checkoutButton');
  }

  async open() {
    await this.page.goto('/#/basket');
    await expect(this.checkoutButton).toBeVisible();
  }

  row(productName: string): Locator {
    return this.rows.filter({ hasText: productName });
  }
}
