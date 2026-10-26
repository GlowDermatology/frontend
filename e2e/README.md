# End-to-end suite

Playwright specs that drive the admin panel against a real backend. They are not part of `npm run check` or CI:
they need a running Django API in fake integrations mode with the demo dataset.

```bash
# backend (repository GlowDermatology/backend), local settings. Django reads os.environ only: export the
# .env first, or seed_demo silently falls back to the demo password instead of SEED_ADMIN_PASSWORD.
set -a; . ./.env; set +a
uv run python manage.py seed_demo --reset      # repeatable dataset; DEBUG or --force only
uv run python manage.py runserver 127.0.0.1:8000

# frontend, api mode
GLOWDERMA_DATA_SOURCE=api GLOWDERMA_API_URL=http://127.0.0.1:8000 GLOWDERMA_INTERNAL_SECRET=<INTERNAL_API_SECRET> \
  GLOWDERMA_ALLOWED_ORIGINS=localhost:3000 GLOWDERMA_COOKIE_SECURE=false npm run build && npm run start

# suite (E2E_BACKEND_DIR: the backend checkout, for the failed Click refund specs)
E2E_ADMIN_PASSWORD=<SEED_ADMIN_PASSWORD> E2E_BACKEND_DIR=../backend npm run e2e
```

| Variable                  | Default                 | Purpose                                                                                       |
| ------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `E2E_BASE_URL`            | `http://localhost:3000` | Frontend under test (any host: local, staging behind the edge)                                |
| `E2E_ADMIN_EMAIL`         | `admin@glowderma.uz`    | Staff account to sign in with                                                                 |
| `E2E_ADMIN_PASSWORD`      | required                | Its password                                                                                  |
| `E2E_IGNORE_HTTPS_ERRORS` | unset                   | Set for a staging edge with a private CA                                                      |
| `E2E_CUSTOMER_PATH`       | `/admin/customers/288`  | Customer used by the adjustment and scheduled-push specs                                      |
| `E2E_BACKEND_DIR`         | unset                   | Backend checkout for `e2e/backend-shell.ts`; unset, the failed Click refund specs are skipped |

The specs mutate data; reset the dataset with `seed_demo --reset` when you need the design numbers back. Each mutating
spec restores what it changed or takes only state the seed has to spare, never a design order (№10248–№10252, except
the retry below), and is skipped with a reason once the seed has nothing left for it:

| Spec                            | What it does                                                                                                                                    | Effect on the seed                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `cashback-adjustment.spec.ts`   | Double-submits +1 000 so‘m (one ledger row), then takes it back out with "Ayirish"                                                              | Balance restored; two ledger rows with unique reasons                                             |
| `orders.spec.ts` cancel         | Cancels the oldest processing order (Payme first: its refund is manual, "Payme kabinetida qaytarish kerak"), checks history and line            | One processing order cancelled                                                                    |
| `orders.spec.ts` transition     | Marks the oldest order with the courier delivered from the status menu                                                                          | One `handed_to_courier` order delivered                                                           |
| `orders.spec.ts` retry shipment | Retries the failed BTS hand-off (the seed's №10250, fake BTS fails its first attempt only) and waits for the parcel                             | №10250 gets its parcel (skipped afterwards)                                                       |
| `payments.spec.ts`              | Marks a manual Payme refund returned from "Harakat kerak"; cancels a Payme order first when none is open                                        | One manual refund settled (one Payme order cancelled when the cancel spec did not leave a refund) |
| `payments.spec.ts` Click 409    | Arranges a failed Click refund (below), Enter, Enter on "Yakunlash" sends one close, Click's 409 leads to "Qo‘lda to‘landi" behind its checkbox | One processing Click order cancelled, its refund closed with a manual payout                      |
| `payments.spec.ts` reversed     | Arranges a failed Click refund, switches its fake Click to "reversed", "Yakunlash" closes it without a payout                                   | One processing Click order cancelled, its refund closed                                           |
| `notifications.spec.ts`         | Schedules a push to the `E2E_CUSTOMER_PATH` customer (never "everyone") for 31 Dec 9999 10:00 and finds it in the history after a reload        | One scheduled message per run, never due (the API has no cancel; cleanup below)                   |
| `appointments.spec.ts`          | Confirms a requested visit on today's board and finds it confirmed after a reload                                                               | One request confirmed (the seed has three on its "today")                                         |

The seed has no failed Click refund yet, and no API sets the fake Click's switches, so the two Click specs arrange one
through the backend's management shell (`e2e/backend-shell.ts`, test-only, never imported by `src/`): it runs
`uv run python manage.py shell` in `E2E_BACKEND_DIR` with that directory's `.env` loaded and sets the newest processing
Click order's `metadata.fake.click` to `{"refund": "failed", "status": "paid"}`; cancelling the order from the UI then
leaves a failed Click refund whose status check answers "paid" (`"reversed"` and `"down"` are the other answers). The
backend must run its local settings (fake integrations, eager Celery), on the same machine as the suite.

The scheduled pushes wait for 31 December 9999, the furthest date the API accepts, so no beat ever sends them to the
customer (a near date would be really sent). The admin API cannot cancel a campaign; remove them with
`seed_demo --reset`, or keep the rest of the data and delete only the spec's messages from the backend shell:

```bash
uv run python manage.py shell -c "from glowderma.notifications.models import Campaign; \
  print(Campaign.objects.filter(title__startswith='e2e rejalashtirilgan', state='scheduled').delete())"
```

On a fresh dataset every spec runs; from the second run on the retry spec is skipped, and after a few runs the
cancel spec falls back to Click orders and the payments and appointments specs are skipped until the next
`seed_demo --reset` (the seed has a handful of processing Payme orders and three requested visits); the two Click
specs take two processing Click orders per run and are skipped once none is left.

The global setup signs in once and stores the session in
`e2e/.auth/` (git-ignored). Browsers: the pinned `@playwright/test` uses the Chromium build that ships with Playwright
1.63 (`npx playwright install chromium` on a fresh machine).
