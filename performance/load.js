// k6 load test: realistic browse → add-to-basket journey at expected peak.
// Runs nightly / on demand in CI against a disposable Juice Shop container.
// Never point this at systems you do not own.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { registerAndLogin, BASE } from './lib.js';

const TERMS = ['juice', 'apple', 'banana', 'owasp', 'lemon', 't-shirt'];

export const options = {
  scenarios: {
    shoppers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // ramp up
        { duration: '2m', target: 20 }, // hold at expected peak
        { duration: '20s', target: 0 }, // ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{name:search}': ['p(95)<800', 'p(99)<1500'],
    'http_req_duration{name:add_item}': ['p(95)<800'],
    'http_req_duration{name:basket}': ['p(95)<800'],
  },
};

export function setup() {
  return registerAndLogin();
}

export default function (session) {
  const auth = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
  let productId;

  group('search', () => {
    const term = TERMS[Math.floor(Math.random() * TERMS.length)];
    const res = http.get(`${BASE}/rest/products/search?q=${encodeURIComponent(term)}`, { tags: { name: 'search' } });
    check(res, { 'search 200': (r) => r.status === 200 });
    const data = res.json('data') || [];
    if (data.length) productId = data[Math.floor(Math.random() * data.length)].id;
  });

  sleep(Math.random() * 2 + 1); // think time

  if (productId) {
    group('add to basket', () => {
      const res = http.post(
        `${BASE}/api/BasketItems`,
        JSON.stringify({ ProductId: productId, BasketId: session.bid, quantity: 1 }),
        { headers: auth, tags: { name: 'add_item' } },
      );
      // 400 = product already in basket (unique constraint) or stock limit reached; both are valid business outcomes here.
      check(res, { 'add item 200/400': (r) => r.status === 200 || r.status === 400 });
    });
  }

  group('view basket', () => {
    const res = http.get(`${BASE}/rest/basket/${session.bid}`, { headers: auth, tags: { name: 'basket' } });
    check(res, { 'basket 200': (r) => r.status === 200 });
  });

  sleep(1);
}
