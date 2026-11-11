# Test Strategy

## What this suite is for

Show how I would cover a real web shop end to end: API first, a thin layer of UI journeys on top, plus accessibility, security regression and performance, all running on every change in CI against a disposable copy of the app.

## Layers

| Layer | Share | Why |
|---|---|---|
| **API** (`tests/api`) | Most tests | Fast, stable, catches business-rule and contract defects without a browser |
| **UI** (`tests/ui`) | Critical journeys only | Proves a user can actually do the thing; avoids re-testing rules the API already covers |
| **Accessibility** (`tests/a11y`) | Key pages | WCAG 2.1 AA scan with a ratchet baseline |
| **Security regression** (`@security`) | Known defects | Tracks real vulnerabilities as expected failures |
| **Performance** (`performance/`) | Critical endpoints | k6 thresholds on latency and error rate |

## Design decisions

- **Each test creates its own user** through the API (`user` fixture). No shared state, so everything runs in parallel and in any order.
- **UI tests log in through the API** (`session` fixture) and inject the token. Only `login.spec.ts` exercises the login form. This makes UI tests faster and failures more specific.
- **UI + API cross-checks.** After a UI action, the test verifies the backend state through the API (e.g., the item is really in the basket), and vice versa.
- **Contracts as code.** Zod schemas validate every API response and give TypeScript types to the client. Schemas also enforce that sensitive fields (`password`, `totpSecret`) are never returned.
- **Known defects stay visible.** Security bugs are `test.fail()` with an id, not skipped tests (see [known-issues.md](known-issues.md)).
- **No hardcoded waits.** ESLint blocks `waitForTimeout` and committed `test.only`.
- **Pinned app version** (`juice-shop:v20.3.0`), so a failing build means our change or a real regression, not an upstream release.

## Pipeline

| Event | Runs | Purpose |
|---|---|---|
| Pull request | Lint, typecheck, API, Chromium, mobile smoke, a11y | Fast merge gate |
| Push to `main` | All of the above + Firefox, WebKit + k6 smoke | Full regression, report published to Pages |
| Nightly | Same as `main` + k6 load test | Trend and capacity check |
| Manual | Optional k6 load test | On-demand performance run |

Each suite runs in its own job against its own Juice Shop container. Playwright blob reports from every job are merged into a single HTML report.

## Not covered (deliberately)

- Payment/checkout completion: Juice Shop's flow requires address and card setup; the basket flow already demonstrates the cross-layer pattern.
- Visual regression: would add screenshot baselines per browser; a good next step.
- Load testing any public instance: performance tests only run against the local container.
