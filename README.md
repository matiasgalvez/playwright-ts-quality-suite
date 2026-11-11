# Playwright TypeScript Quality Suite

[![Quality Suite](https://github.com/matiasgalvez/playwright-ts-quality-suite/actions/workflows/ci.yml/badge.svg)](https://github.com/matiasgalvez/playwright-ts-quality-suite/actions/workflows/ci.yml)
[![Test report](https://img.shields.io/badge/report-latest-2ea44f)](https://matiasgalvez.github.io/playwright-ts-quality-suite/)

A full-stack quality suite for a real web shop: **API, UI, accessibility, security regression and performance tests** in TypeScript, running in CI against a disposable [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) container.

It is built the way I would set up quality for a product team: most coverage at the API layer, a thin set of UI journeys, contracts validated as code, known defects tracked instead of hidden, and every suite wired into the pipeline as a quality gate.

**📊 Latest HTML report:** https://matiasgalvez.github.io/playwright-ts-quality-suite/

## What it shows

| Area | How |
|---|---|
| **API testing** | Typed API client, positive + negative + auth cases, contract validation with **Zod** |
| **UI testing** | Playwright + Page Object Model on Chromium, Firefox, WebKit and a mobile viewport |
| **UI ↔ API cross-checks** | UI actions verified in the backend, API-created data verified in the UI |
| **Security regression** | 6 real vulnerabilities (SQLi, IDOR, mass assignment, hash leak, XSS, stack-trace leak) tracked as expected failures |
| **Accessibility** | axe-core WCAG 2.1 AA scans with a "ratchet" baseline that blocks new violations |
| **Performance** | **k6** smoke and load tests with p95 / p99 / error-rate thresholds |
| **CI/CD** | GitHub Actions: PR gate, full regression on `main`, nightly load test, merged report on GitHub Pages |
| **Code quality** | Strict TypeScript, ESLint rules that ban hardcoded waits and `test.only` |

## Findings

The suite found these defects in the application under test. Each one is documented in [docs/known-issues.md](docs/known-issues.md) and guarded by a test.

| ID | Severity | Defect |
|---|---|---|
| SEC-01 | Critical | SQL injection in login authenticates as admin without a password |
| SEC-02 | Critical | Anyone can register with `role: "admin"` |
| SEC-03 | High | Any user can read any other user's basket (IDOR) |
| SEC-04 | High | `whoami?fields=password` returns the password hash |
| SEC-05 | High | Reflected XSS through the search term |
| SEC-06 | Medium | Malformed requests return Node.js stack traces |

## Project structure

```
├── src/
│   ├── api/JuiceShopClient.ts   # typed API client; validated helpers + raw calls for negative tests
│   ├── schemas/                 # Zod contracts (also the TypeScript types)
│   ├── pages/                   # page objects: NavBar, SearchResults, Login, Basket
│   ├── fixtures/                # api, user (fresh per test), session (API login injected into browser)
│   └── data/                    # test data factories
├── tests/
│   ├── api/                     # products, auth, basket, security
│   ├── ui/                      # search, login, basket
│   └── a11y/                    # axe scans + baseline
├── performance/                 # k6 smoke + load
├── docs/                        # test strategy, known issues
├── docker-compose.yml           # Juice Shop bound to localhost
└── .github/workflows/ci.yml
```

## Test inventory

| Suite | Tests | Runs on |
|---|---|---|
| API | 24 | Every PR |
| UI | 10 per browser | Chromium on PR; + Firefox, WebKit on `main` |
| Mobile smoke | 3 | Every PR (Pixel 7 viewport) |
| Accessibility | 3 pages | Every PR |
| k6 smoke | 3 endpoints | Every push to `main` |
| k6 load | Browse → add to basket, 20 VUs | Nightly / manual |

## Run it locally

Requirements: Node 22+, Docker.

```bash
npm ci
npx playwright install --with-deps
npm run app:up            # starts Juice Shop on http://localhost:3000 (localhost only)

npm test                  # everything
npm run test:api          # API only, no browser
npm run test:ui           # Chromium UI
npm run test:smoke        # @smoke across projects
npm run test:a11y
npm run test:security
npm run perf:smoke        # k6 via Docker
npm run report            # open the HTML report

npm run app:down
```

`BASE_URL` (see `.env.example`) points the suite at any other instance you own.

> ⚠️ Juice Shop is intentionally insecure. The compose file binds it to `127.0.0.1` so it is never reachable from your network. Never run the k6 load test against a server you do not own.

## Key design decisions

See [docs/test-strategy.md](docs/test-strategy.md). In short: each test creates its own user, UI tests log in through the API, schemas enforce that sensitive fields never leak, known defects use `test.fail()` so a fix turns the build red until the test is updated, and the app version is pinned so failures mean something.

## Author

**Matias Galvez**, Senior QA Automation Engineer / SDET · [LinkedIn](https://linkedin.com/in/matias-nicolas-galvez) · [Portfolio](https://matiasgalvez.github.io/qa-automation-portfolio/)
