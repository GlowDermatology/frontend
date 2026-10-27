# End-to-end suite

Playwright specs that drive the admin panel against a real backend. They are not part of `npm run check` or CI:
they need a running Django API in fake integrations mode with the demo dataset.

The suite needs the gap-closure backend: `feat/m3-gaps` at `4d4a5aa` or later (settings legal texts, staff
management, specialists and services, category images, banner and campaign URLs). Before it, it needed the M3
backend: `feat/m3-integration` at `d4db5cf` or later (the same tree as `d9843de`, before the
branch was rebased). Against an M2 backend the M3 specs fail: «Bekor qilish» is not offered (no `cancelled_at`), the
no-Click-id specs expect M3's `conflict` and `manual_reason`, and the Google session gets no `auth_method`.

```bash
# backend (repository GlowDermatology/backend, M3), local settings with OAUTH_MODE=fake. Django reads os.environ only:
# export the .env first, or seed_demo silently falls back to the demo password instead of SEED_ADMIN_PASSWORD.
set -a; . ./.env; set +a
uv run python manage.py seed_demo --reset      # repeatable dataset; DEBUG or --force only
uv run python manage.py runserver 127.0.0.1:8000

# frontend, api mode, with the fake Google and Facebook sign-in (for account-social.spec.ts; skipped without it)
GLOWDERMA_DATA_SOURCE=api GLOWDERMA_API_URL=http://127.0.0.1:8000 GLOWDERMA_INTERNAL_SECRET=<INTERNAL_API_SECRET> \
  GLOWDERMA_ALLOWED_ORIGINS=localhost:3000 GLOWDERMA_COOKIE_SECURE=false \
  GLOWDERMA_OAUTH_PROVIDERS=google,facebook GLOWDERMA_OAUTH_MODE=fake GLOWDERMA_OAUTH_ALLOW_FAKE=true \
  npm run build && npm run start

# suite (E2E_BACKEND_DIR: the backend checkout, for the failed Click refund specs)
E2E_ADMIN_PASSWORD=<SEED_ADMIN_PASSWORD> E2E_BACKEND_DIR=../backend npm run e2e
```

| Variable                  | Default                 | Purpose                                                                              |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `E2E_BASE_URL`            | `http://localhost:3000` | Frontend under test (any host: local, staging behind the edge)                       |
| `E2E_ADMIN_EMAIL`         | `admin@glowderma.uz`    | Staff account to sign in with                                                        |
| `E2E_ADMIN_PASSWORD`      | required                | Its password                                                                         |
| `E2E_IGNORE_HTTPS_ERRORS` | unset                   | Set for a staging edge with a private CA                                             |
| `E2E_CUSTOMER_PATH`       | `/admin/customers/288`  | Customer used by the adjustment and scheduled-push specs                             |
| `E2E_APPOINTMENTS_DAY`    | `2026-10-26`            | The seed's design day, where the visit spec looks once today has no request left     |
| `E2E_BACKEND_DIR`         | unset                   | Backend checkout for `e2e/backend-shell.ts`; unset, the specs that arrange data skip |
| `E2E_API_URL`             | unset                   | Backend origin (`http://127.0.0.1:8000`) for the customer-API checks; unset, skipped |

The specs mutate data; reset the dataset with `seed_demo --reset` when you need the design numbers back. Each mutating
spec restores what it changed or takes only state the seed has to spare, never a design order (№10248–№10252, except
the retry below), and is skipped with a reason once the seed has nothing left for it:

| Spec                             | What it does                                                                                                                                                                                                                                                                | Effect on the seed                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `cashback-adjustment.spec.ts`    | Double-submits +1 000 so‘m (one ledger row), then takes it back out with "Ayirish"                                                                                                                                                                                          | Balance restored; two ledger rows with unique reasons                                               |
| `orders.spec.ts` cancel          | Cancels the oldest processing order (Payme first: its refund is manual, "Payme kabinetida qaytarish kerak"), checks history and line                                                                                                                                        | One processing order cancelled                                                                      |
| `orders.spec.ts` transition      | Marks the oldest order with the courier delivered from the status menu                                                                                                                                                                                                      | One `handed_to_courier` order delivered                                                             |
| `orders.spec.ts` retry shipment  | Retries the failed BTS hand-off (the seed's №10250, fake BTS fails its first attempt only) and waits for the parcel                                                                                                                                                         | №10250 gets its parcel (skipped afterwards)                                                         |
| `payments.spec.ts`               | Marks a manual Payme refund returned from "Harakat kerak"; cancels a Payme order first when none is open                                                                                                                                                                    | One manual refund settled (one Payme order cancelled when the cancel spec did not leave a refund)   |
| `payments.spec.ts` Click 409     | Arranges a failed Click refund (below), Enter, Enter on "Yakunlash" sends one close, Click's 409 leads to "Qo‘lda to‘landi" behind its checkbox                                                                                                                             | One processing Click order cancelled, its refund closed with a manual payout                        |
| `payments.spec.ts` reversed      | Arranges a failed Click refund, switches its fake Click to "reversed", "Yakunlash" closes it without a payout                                                                                                                                                               | One processing Click order cancelled, its refund closed                                             |
| `payments.spec.ts` no Click id   | Removes a processing Click order's Click payment id and cancels it: the board says why the refund is manual (M3 `manual_reason` `no_paydoc`), "Qaytarildi deb belgilash" settles it                                                                                         | One processing Click order cancelled, its refund settled                                            |
| `payments.spec.ts` no id, failed | Arranges a failed Click refund, then removes the Click payment id: "Yakunlash" answers the M3 `conflict` and moves to "Qo‘lda to‘landi" with its own message                                                                                                                | One processing Click order cancelled, its refund closed with a manual payout                        |
| `payments.spec.ts` Click down    | "Yakunlash" on the seed's failed refund of №10175 (its fake Click is "down"): the dialog stays open with Click's 503 message                                                                                                                                                | None (Click's 503 changes nothing)                                                                  |
| `notifications.spec.ts`          | Schedules a push to the `E2E_CUSTOMER_PATH` customer (never "everyone") for 31 Dec 9999 10:00, finds it after a reload and cancels it ("Bekor qilish", M3)                                                                                                                  | One cancelled message per run, nothing left scheduled                                               |
| `notifications.spec.ts` refused  | Schedules another, moves it to `queued` through the backend shell while the dialog is open: the 409 closes the dialog, the row is re-read, focus is on the history                                                                                                          | Moved back to `scheduled`, then cancelled by the cleanup                                            |
| `account-social.spec.ts`         | Links Google and Facebook to fresh fake subjects, signs in with Google in a second browser: the password-first hint instead of «Bog‘lash», «Uzish» keeps focus on the row                                                                                                   | Both unlinked again (only what the run linked); skipped without fake sign-in or if one is linked    |
| `appointments.spec.ts`           | Confirms a requested visit on today's board (else on the seed's design day, `E2E_APPOINTMENTS_DAY`) and finds it confirmed after a reload                                                                                                                                   | One request confirmed (the seed has three on its design day)                                        |
| `settings-legal.spec.ts`         | Edits the ru terms draft (the unsaved-change guard stops a sidebar click), saves, publishes a new version behind the confirmation and reads it from `settings/public/`; publishing with an empty uz draft shows the 409; a Telegram link off `t.me` is refused on its field | Legal texts and `terms_version` restored through the backend shell (snapshot before, restore after) |
| `specialists.spec.ts`            | Creates an `e2e klinika …` service and specialist, offers it at 55 000 so‘m, sets every day 09:00–18:00 with a break, activates it and finds the slots in the customer API; a block removes 10:00, a day off removes the day; folded search finds it                        | Both rows deleted through the backend shell (the API never deletes them; nothing is booked)         |
| `staff.spec.ts`                  | Invites `e2e-xodim-…@glowderma.uz` (taken email refused, password shown once), renames it, resets the password, deactivates and reactivates it; the own row offers no deactivation                                                                                          | The account deleted through the backend shell                                                       |
| `notifications-history.spec.ts`  | Adds 21 cancelled `e2e tarix …` campaigns through the backend shell, pages the history, filters by state and kind in the URL and exports `bildirishnomalar` with the filters                                                                                                | The campaigns deleted again                                                                         |
| `catalog-media.spec.ts`          | An `e2e-kat-…` category gets an image (thumbnail from the media host), loses it, a GIF is refused, then it is deleted; an `e2e banner …` links to an https page (an http one is refused) and the customer banner list carries the URL, then it is deleted                   | Nothing left (the shell removes a failed run's leftovers)                                           |

Since M3 the seed keeps two failed Click refunds of its own (№10100, whose fake Click still reports the payment paid,
and №10175, whose fake Click is "down"); the Click-down spec uses №10175 and leaves №10100 to staff. No API sets the
fake Click's switches, removes a payment's Click payment id or starts a campaign's send, so the specs arrange that
through the backend's management shell (`e2e/backend-shell.ts`, test-only, never imported by `src/`): it runs
`uv run python manage.py shell` in `E2E_BACKEND_DIR` with that directory's `.env` loaded. The Click specs take the
newest processing Click order the board lists whose paid Click payment still has `click_paydoc_id`
(`clickOrdersWithPaydoc`; an order a stopped run left without the id is passed over) and set its `metadata.fake.click`
to `{"refund": "failed", "status": "paid"}` (cancelling the order from the UI then leaves a failed Click refund whose
status check answers "paid"; `"reversed"` and `"down"` are the other answers), or drop `click_paydoc_id` from its
payment's `provider_state`. The refused-cancel spec moves its own campaign between `scheduled` and `queued`
(`setCampaignState`). The backend must run its local settings (fake integrations, eager Celery), on the same machine
as the suite.

The scheduled pushes wait for 31 December 9999, the furthest date the API accepts, so no beat ever sends them to the
customer (a near date would be really sent). Each spec cancels its own (`POST notifications/{id}/cancel/`, M3), and an
`afterEach` cancels from the history any row titled `e2e rejalashtirilgan …` that is still scheduled, so a failed run
leaves nothing waiting. Only a run killed before its cleanup (or before the refused-cancel spec moved its campaign
back from `queued`) leaves one: cancel it from the history, or reset with `seed_demo --reset`. Likewise the social spec
unlinks in an `afterEach` what it linked; a killed run can leave Google or Facebook linked to the admin, and the spec
then skips until they are unlinked in Sozlamalar.

On a fresh dataset every spec runs; from the second run on the retry spec is skipped, and after a few runs the
cancel spec falls back to Click orders and the payments and appointments specs are skipped until the next
`seed_demo --reset` (the seed has a handful of processing Payme orders and three requested visits); the Click specs
take four processing Click orders per run (the seed has six outside the design orders) and are skipped once none with
a Click payment id is left.

The global setup signs in once and stores the session in
`e2e/.auth/` (git-ignored). Browsers: the pinned `@playwright/test` uses the Chromium build that ships with Playwright
1.63 (`npx playwright install chromium` on a fresh machine).
