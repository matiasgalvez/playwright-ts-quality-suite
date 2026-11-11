import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { z } from 'zod';
import {
  AddBasketItemResponse,
  BasketResponse,
  LoginResponse,
  ProductSearchResponse,
  RegisterResponse,
  WhoAmIResponse,
} from '../schemas';
import type { UserCredentials } from '../data/userFactory';

export interface Session {
  token: string;
  bid: number;
  email: string;
}

/**
 * Thin, typed wrapper around the Juice Shop REST API.
 * Raw methods return the APIResponse (for negative tests); helper methods validate and return parsed data.
 */
export class JuiceShopClient {
  constructor(private readonly request: APIRequestContext) {}

  // ---------- raw calls ----------
  register(user: UserCredentials, extra: Record<string, unknown> = {}): Promise<APIResponse> {
    return this.request.post('/api/Users', {
      data: { email: user.email, password: user.password, passwordRepeat: user.password, ...extra },
    });
  }

  login(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/rest/user/login', { data: { email, password } });
  }

  search(query: string): Promise<APIResponse> {
    return this.request.get('/rest/products/search', { params: { q: query } });
  }

  getBasket(basketId: number, token?: string): Promise<APIResponse> {
    return this.request.get(`/rest/basket/${basketId}`, { headers: auth(token) });
  }

  addBasketItem(token: string, basketId: number, productId: number, quantity = 1): Promise<APIResponse> {
    return this.request.post('/api/BasketItems', {
      headers: auth(token),
      data: { ProductId: productId, BasketId: basketId, quantity },
    });
  }

  whoAmI(token?: string, fields?: string): Promise<APIResponse> {
    return this.request.get('/rest/user/whoami', {
      headers: token ? { Cookie: `token=${token}` } : {},
      params: fields ? { fields } : undefined,
    });
  }

  // ---------- validated helpers ----------
  async registerOk(user: UserCredentials) {
    const res = await this.register(user);
    expect(res.status(), await res.text()).toBe(201);
    return parse(RegisterResponse, await res.json()).data;
  }

  async loginOk(user: UserCredentials): Promise<Session> {
    const res = await this.login(user.email, user.password);
    expect(res.status(), await res.text()).toBe(200);
    const { authentication } = parse(LoginResponse, await res.json());
    return { token: authentication.token, bid: authentication.bid, email: authentication.umail };
  }

  async searchOk(query: string) {
    const res = await this.search(query);
    expect(res.status()).toBe(200);
    return parse(ProductSearchResponse, await res.json()).data;
  }

  async productByName(name: string) {
    const product = (await this.searchOk(name)).find((p) => p.name === name);
    if (!product) throw new Error(`Product "${name}" not found in catalog`);
    return product;
  }

  async addBasketItemOk(session: Session, productId: number, quantity = 1) {
    const res = await this.addBasketItem(session.token, session.bid, productId, quantity);
    expect(res.status(), await res.text()).toBe(200);
    return parse(AddBasketItemResponse, await res.json()).data;
  }

  async basketOk(session: Session) {
    const res = await this.getBasket(session.bid, session.token);
    expect(res.status(), await res.text()).toBe(200);
    return parse(BasketResponse, await res.json()).data;
  }

  async whoAmIOk(token: string) {
    const res = await this.whoAmI(token);
    expect(res.status()).toBe(200);
    return parse(WhoAmIResponse, await res.json()).user;
  }
}

function auth(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Parses with a Zod schema and fails with a readable list of contract violations. */
export function parse<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Response does not match contract:\n${issues}`);
  }
  return result.data;
}
