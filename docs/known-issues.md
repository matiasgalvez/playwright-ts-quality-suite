# Known Issues

Defects found by this suite in the application under test ([OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) v20.3.0, which is intentionally vulnerable).

Each one has a test that asserts the **correct** behavior and is marked `test.fail()`. That means:

- the defect stays **visible** in every report as an expected failure (not deleted, not skipped);
- the pipeline stays green while the issue is open and triaged;
- if someone fixes it, the test unexpectedly passes, **the build goes red**, and the annotation gets removed. The fix is now protected by a regression test.

| ID | Severity | Area | Test |
|---|---|---|---|
| SEC-01 | Critical | Auth | `tests/api/security.spec.ts` |
| SEC-02 | Critical | Registration | `tests/api/security.spec.ts` |
| SEC-03 | High | Basket | `tests/api/security.spec.ts` |
| SEC-04 | High | User profile | `tests/api/security.spec.ts` |
| SEC-05 | High | Search UI | `tests/ui/search.spec.ts` |

---

### SEC-01 — SQL injection in login authenticates without a password
**Request:** `POST /rest/user/login` with `{"email": "' OR 1=1--", "password": "x"}`
**Expected:** `401 Invalid email or password.`
**Actual:** `200` with a valid token for the first user in the table (the administrator).
**Impact:** Full account takeover, including admin.
**Root cause:** the login query concatenates user input into SQL instead of using parameters.

### SEC-02 — Users can register themselves as admin (mass assignment)
**Request:** `POST /api/Users` with `{"email": "...", "password": "...", "passwordRepeat": "...", "role": "admin"}`
**Expected:** `role` from the client is ignored; new users are `customer`.
**Actual:** user is created with `role: "admin"`.
**Impact:** Privilege escalation by any anonymous visitor.

### SEC-03 — Any logged-in user can read any basket (IDOR)
**Request:** `GET /rest/basket/{someone else's basket id}` with a valid token for a different user
**Expected:** `401/403/404`.
**Actual:** `200` with the other user's basket contents.
**Impact:** Exposure of other customers' data; basket ids are sequential and easy to enumerate.
**Note:** *adding* items to another user's basket **is** correctly blocked (covered by a passing test in `basket.spec.ts`), so the ownership check exists for writes but not for reads.

### SEC-04 — `whoami` returns the password hash when asked
**Request:** `GET /rest/user/whoami?fields=email,password` with the session cookie
**Expected:** sensitive columns are never selectable.
**Actual:** the response includes the user's password hash.
**Impact:** Offline password cracking.

### SEC-05 — Reflected XSS in product search
**Steps:** search for `<b>bold</b>`.
**Expected:** the literal text `<b>bold</b>` is shown in the results heading.
**Actual:** the term is rendered as HTML (bold text). The frontend binds it with `bypassSecurityTrustHtml`.
**Impact:** Script injection through a crafted search link.


---

## Accessibility baseline

`tests/a11y/a11y-baseline.json` lists axe rule ids that already fail on each page (WCAG 2.1 AA, axe-core 4.14, found on the first run):

| ID | Impact | Rule | Pages | Element |
|---|---|---|---|---|
| A11Y-01 | Critical | `label` | all | Navbar search `<input>` has no label |
| A11Y-02 | Serious | `label-content-name-mismatch` | all | Home, basket and language buttons: visible text is not part of the accessible name (breaks voice control, e.g. "click Your Basket") |
| A11Y-03 | Serious | `color-contrast` | search | "Only 1 left" ribbon text: 2.86:1, needs 4.5:1 |

`tests/a11y/a11y-baseline.json` holds these rule ids. The accessibility tests only fail on **new** violations, so accessibility can only improve ("ratchet"). When a baseline rule stops failing, the test adds an `a11y-fixed` annotation saying it can be removed from the baseline.

Full axe results for every page are attached to each test in the HTML report.
