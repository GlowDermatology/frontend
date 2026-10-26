# End-to-end suite

Playwright specs that drive the admin panel against a real backend. They are not part of `npm run check` or CI:
they need a running Django API in fake integrations mode with the demo dataset.

```bash
# backend (repository GlowDermatology/backend), local settings, SEED_ADMIN_PASSWORD set in .env
uv run python manage.py seed_demo --reset      # repeatable dataset; DEBUG or --force only
uv run python manage.py runserver 127.0.0.1:8000

# frontend, api mode
GLOWDERMA_DATA_SOURCE=api GLOWDERMA_API_URL=http://127.0.0.1:8000 GLOWDERMA_INTERNAL_SECRET=<INTERNAL_API_SECRET> \
  GLOWDERMA_ALLOWED_ORIGINS=localhost:3000 GLOWDERMA_COOKIE_SECURE=false npm run build && npm run start

# suite
E2E_ADMIN_PASSWORD=<SEED_ADMIN_PASSWORD> npm run e2e
```

| Variable                  | Default                 | Purpose                                                        |
| ------------------------- | ----------------------- | -------------------------------------------------------------- |
| `E2E_BASE_URL`            | `http://localhost:3000` | Frontend under test (any host: local, staging behind the edge) |
| `E2E_ADMIN_EMAIL`         | `admin@glowderma.uz`    | Staff account to sign in with                                  |
| `E2E_ADMIN_PASSWORD`      | required                | Its password                                                   |
| `E2E_IGNORE_HTTPS_ERRORS` | unset                   | Set for a staging edge with a private CA                       |
| `E2E_CUSTOMER_PATH`       | `/admin/customers/288`  | Customer card used by the adjustment spec                      |

The specs mutate data (cashback adjustments carry a unique reason, so a rerun stays valid); reset the dataset with
`seed_demo --reset` when you need the design numbers back. The global setup signs in once and stores the session in
`e2e/.auth/` (git-ignored). Browsers: the pinned `@playwright/test` uses the Chromium build that ships with Playwright
1.63 (`npx playwright install chromium` on a fresh machine).
