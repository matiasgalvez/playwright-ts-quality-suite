import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE = __ENV.BASE_URL || 'http://localhost:3000';

/** Creates a dedicated performance-test user once per run and returns its session. */
export function registerAndLogin() {
  const email = `perf.${Date.now()}@quality-suite.test`;
  const password = 'Perf!Test#2026';
  const headers = { 'Content-Type': 'application/json' };

  const reg = http.post(`${BASE}/api/Users`, JSON.stringify({ email, password, passwordRepeat: password }), { headers });
  if (!check(reg, { 'setup: register 201': (r) => r.status === 201 })) fail(`register failed: ${reg.status} ${reg.body}`);

  const login = http.post(`${BASE}/rest/user/login`, JSON.stringify({ email, password }), { headers });
  if (!check(login, { 'setup: login 200': (r) => r.status === 200 })) fail(`login failed: ${login.status}`);

  const { token, bid } = login.json('authentication');
  return { email, password, token, bid };
}
