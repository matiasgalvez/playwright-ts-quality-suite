// k6 smoke test: minimal load, verifies the system is healthy and the script works.
// Runs on every push to main in CI. Thresholds turn it into a pass/fail quality gate.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { registerAndLogin, BASE } from './lib.js';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{name:search}': ['p(95)<500'],
    'http_req_duration{name:basket}': ['p(95)<500'],
    'http_req_duration{name:login}': ['p(95)<800'],
  },
};

export function setup() {
  return registerAndLogin();
}

export default function (session) {
  group('browse', () => {
    const res = http.get(`${BASE}/rest/products/search?q=juice`, { tags: { name: 'search' } });
    check(res, {
      'search 200': (r) => r.status === 200,
      'search has results': (r) => r.json('data').length > 0,
    });
  });

  sleep(1);

  group('basket', () => {
    const res = http.get(`${BASE}/rest/basket/${session.bid}`, {
      headers: { Authorization: `Bearer ${session.token}` },
      tags: { name: 'basket' },
    });
    check(res, { 'basket 200': (r) => r.status === 200 });
  });

  group('login', () => {
    const res = http.post(
      `${BASE}/rest/user/login`,
      JSON.stringify({ email: session.email, password: session.password }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
    );
    check(res, { 'login 200': (r) => r.status === 200 });
  });

  sleep(1);
}
