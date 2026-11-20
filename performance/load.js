// k6 load test: realistic browse → add to basket → remove journey at expected peak.
// Runs nightly / on demand in CI against a disposable Juice Shop container.
// Never point this at systems you do not own.
//
// Each VU logs in as its own shopper with its own basket, and every iteration removes
// the item it added. Sharing one basket made concurrent VUs add the same product twice,
// which hits Juice Shop's (BasketId, ProductId) unique constraint and returns 500.
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
    'http_req_duration{name:remove_item}': ['p(95)<800'],
  },
};

let session; // one shopper per VU, created on its first iteration

export default function () {
  if (!session) session = registerAndLogin(`vu${__VU}`);
  const auth = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
  let productId;
  let itemId;

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
      check(res, { 'add item 200': (r) => r.status === 200 });
      itemId = res.status === 200 ? res.json('data.id') : undefined;
    });
  }

  group('view basket', () => {
    const res = http.get(`${BASE}/rest/basket/${session.bid}`, { headers: auth, tags: { name: 'basket' } });
    check(res, { 'basket 200': (r) => r.status === 200 });
  });

  if (itemId) {
    group('remove from basket', () => {
      const res = http.del(`${BASE}/api/BasketItems/${itemId}`, null, { headers: auth, tags: { name: 'remove_item' } });
      check(res, { 'remove item 200': (r) => r.status === 200 });
    });
  }

  sleep(1);
}
