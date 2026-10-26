# Glow Derma — web frontend

The Glow Derma web frontend, built from the Claude Design board "Glow Derma". It contains:

- the **public landing page** in Uzbek (`/`), Russian (`/ru`) and English (`/en`);
- the **admin panel** (`/admin`): dashboard, orders, order detail, products, product editor, categories, banners, customer card, customer groups, cashback settings, notifications, appointments, settings and the audit log.

It runs on **mock data** behind a small data layer. That layer has the same shape as the planned Django REST Framework API, so connecting the backend replaces function bodies without touching the UI.

> **Demo mode** (`GLOWDERMA_DATA_SOURCE` unset or `mock`): admin reads come from in-memory fixtures and admin mutations are Server Actions whose mock bodies compute the next state from those fixtures without saving it. A reload restores the dataset, and every admin page shows a "Demo ma’lumotlar" marker. Nothing is sent to customers, Billz, BTS, Click/Payme or Firebase.

---

## Commands

Requires Node.js ≥ 20.9. The package manager is **npm** (a lockfile is committed).

```bash
npm install          # install dependencies
npm run dev          # dev server on http://localhost:3000
npm run build        # production build (Turbopack)
npm run start        # serve the production build
npm run lint         # ESLint (flat config, next/core-web-vitals + TypeScript)
npm run typecheck    # next typegen (typed routes, PageProps) + tsc --noEmit
npm run test         # Vitest unit tests (domain rules + mock dataset invariants)
npm run format       # Prettier (with the Tailwind class sorter)
npm run check        # lint + typecheck + test + format:check
```

### Environment

| Variable                             | Purpose                                                                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`               | Canonical origin for metadata, Open Graph, `sitemap.xml` and `robots.txt`. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`.                                  |
| `GLOWDERMA_DATA_SOURCE`              | `mock` (default) serves the fixtures; `api` talks to Django. Read per request (after `await connection()`), so one build serves both modes.                                              |
| `GLOWDERMA_API_URL`                  | Django origin without a trailing slash (api mode only), e.g. `http://127.0.0.1:8000`.                                                                                                    |
| `GLOWDERMA_INTERNAL_SECRET`          | Shared secret sent as `X-GD-Internal-Secret`; must equal Django's `INTERNAL_API_SECRET` (api mode only).                                                                                 |
| `GLOWDERMA_ALLOWED_ORIGINS`          | Exact `host[:port]` entries allowed to invoke Server Actions and the auth route handlers (the host in the address bar). Read when `next.config.ts` loads (build/start), not per request. |
| `GLOWDERMA_COOKIE_SECURE`            | `true` behind HTTPS: session cookies get `Secure` and the `__Secure-` prefix. Defaults to `true` in production builds.                                                                   |
| `GLOWDERMA_MEDIA_HOSTS`              | `host[:port]` entries `next/image` may optimise (Django's public media host). Read when `next.config.ts` loads.                                                                          |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Stable key shared by every Next instance so encrypted Server Action references decrypt everywhere. Required with more than one instance.                                                 |

See `.env.example`.

**Deployment assumption (edge contract).** The Next server must be reachable only through a single trusted edge proxy that appends or overwrites `X-Forwarded-For` (and `X-Real-IP`). The API client forwards the rightmost `X-Forwarded-For` hop to Django as `X-GD-Client-IP` (`clientIp()` in `src/data/api/client.ts`), because that hop is the one the edge wrote from the TCP peer; hops to its left come from the browser and are ignored. If a second proxy is ever chained in front, it must collapse the header, or Django's per-client-IP throttles and `AuditEntry.ip` would see the inner proxy's address.

---

## Architecture

```
src/
  app/                       Routes only (thin). Three root layouts:
    (uz)/                      "/"            Uzbek landing (static)
    (intl)/[locale]/           "/ru", "/en"   other landing languages (static)
    admin/                     "/admin/**"    admin panel (noindex, own <html>)
    global-not-found.tsx       branded 404 for unmatched URLs
    robots.ts, sitemap.ts, icon.svg, apple-icon.png
  components/
    ui/                      Design-system primitives: Button, Badge, Field/TextInput/AffixInput,
                             SegmentedControl, Switch, Dialog/AlertDialog, SelectMenu/ActionMenu,
                             Toast, Card, Breadcrumbs, Avatar, ScrollRegion, Icon (the design's
                             own 24px stroke icon set)
    brand/                   ProductArt (the board's product illustrations), Rings, 404 view
  features/
    landing/                 Sections, copy dictionaries (uz/ru/en), i18n, metadata
    admin/                   One folder per screen + shell (sidebar, drawer, search) + shared
                             (page header, status badges, URL state, pagination, skeletons,
                             export menu, reorder buttons)
  domain/                    Framework-free types and business rules (orders, cashback tiers,
                             products, categories, banners, jobs, appointments, notifications).
                             Unit-tested.
  data/                      The seam to the backend:
    *.ts                       server-only query dispatchers (`getOrder`, `listProducts`, …)
    *.actions.ts               Server Actions ("use server") returning ActionResult<T>
    *.schema.ts                Zod schemas shared by forms and Server Actions
    source.ts, now.ts          dataSource() (GLOWDERMA_DATA_SOURCE, per request), requestNow()
    action-guard.ts            session/csrf gate, zod field errors, api-mode refresh()
    auth.ts, auth/             staff session DAL (verifyStaff/requireStaff/getMe), cookies, jwt, csrf
    api/                       Django client (apiFetch/apiFetchRaw/cachedGet), typed catalog calls,
                               ApiError, mappers (+ recorded fixtures), generated schema
    mock/                      deterministic fixtures, *.queries.ts and *.actions.ts mock bodies
    config.ts                  client-safe constants (DEMO_NOW, referenceNow() for mock internals)
  lib/                       cn (clsx + tailwind-merge), deterministic uz formatting, fonts
```

**Rendering**

- `cacheComponents` is on, so Partial Prerendering is the default.
- The landing pages are fully static (○), with `ensureStatic` on the landing page segment.
- Admin pages prerender the shell (sidebar, header) and stream the data-dependent body inside `<Suspense>` (◐).
- Components are Server Components by default. Client components are limited to interactive leaves: forms, dialogs, menus, charts, the schedule and tabs.
- List screens keep filters, sorting and pagination in the URL, so links are shareable and map 1:1 to DRF query parameters. Navigation runs in transitions, so the old rows dim instead of flashing a skeleton.

**Styling**

- Tailwind CSS 4. Design tokens are CSS variables (`--gd-*`) mapped through `@theme inline`; the board's light and dark token sets are both defined, but only light is applied.
- The default palette, type scale, radii and shadows are replaced by the design's, so off-system values stand out in review.
- Motion uses CSS only. Everything is disabled under `prefers-reduced-motion`.

---

## Key decisions

| Decision                                                                                                                                                   | Why                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uzbek at `/`, Russian and English under a `[locale]` segment, one root layout per language group                                                           | Correct `<html lang>` on every page without middleware. Every landing page stays static.                                                                         |
| Data layer of async functions plus `ActionResult<T>` mutations                                                                                             | Components never import fixtures. Switching to DRF changes function bodies only, and expected failures come back as values next to the right field.              |
| Mock dataset reproduces the design exactly (pinned by tests)                                                                                               | Screenshots compare 1:1 with the board. Counts, totals and tiers stay consistent across screens.                                                                 |
| Fixed demo clock (`DEMO_NOW` = Sat 24 Oct 2026 12:00, Tashkent)                                                                                            | Deterministic prerendering and no hydration mismatches. With the API, this becomes the request time.                                                             |
| Hand-written Uzbek number and date formatting                                                                                                              | `Intl` `uz` data differs between Node and browsers, which caused hydration mismatches. The board's format also needs NBSP thousands separators and U+2212 minus. |
| React Hook Form + Zod only for real forms (product editor, order cancellation, cashback adjustment, notification compose); local state for the tier editor | The tier editor validates across rows with the domain's `analyzeTiers`. Forcing that through a form library would add code without benefit.                      |
| `"use no memo"` on the four RHF form components                                                                                                            | The React Compiler memoised `register()` calls, so fields lost dirty tracking after `reset()`. Opting those components out fixes it.                             |
| Radix primitives for dialog, menu and tabs; native radios for segmented controls and selection cards                                                       | Correct keyboard and ARIA behaviour without custom focus code.                                                                                                   |
| Unknown business behaviour is stated, not faked                                                                                                            | Actions the design doesn't specify show a "Bu amal hali ulanmagan" notice. Sidebar sections that aren't designed render an explicit placeholder.                 |

---

## DRF integration guide

The seam is already in place: every public function in `src/data/*.ts` dispatches on `GLOWDERMA_DATA_SOURCE` (`await dataSource()`, read per request after `connection()`), so switching modes is configuration, not a code change.

1. **Switch the source.** Set `GLOWDERMA_DATA_SOURCE=api` together with `GLOWDERMA_API_URL` and `GLOWDERMA_INTERNAL_SECRET`. Each dispatcher in `src/data/<resource>.ts` has two branches: the mock branch calls `src/data/mock/<resource>.queries.ts` (the fixtures, anchored on `DEMO_NOW` / `DESIGN_DAY`), the api branch calls the endpoint named in its JSDoc through `cachedGet`/`apiFetch` (`src/data/api/client.ts`) and maps the response with `src/data/api/mappers`. Until an endpoint is wired, the api branch returns the documented empty shape via `notWiredYet()` and warns once per resource.

   | Function                                                     | Endpoint                                                                                                                                              |
   | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `listOrders` / `getOrderStatusCounts` (wired)                | `GET /api/v1/admin/orders/?status=&search=&fulfilment=&payment=&period=&date_from=&date_to=&customer=&ordering=&page=&page_size=`, `status-counts/`   |
   | `getOrder` (wired, `cache()` per request)                    | `GET /api/v1/admin/orders/{id}/` (404 → `null`; `generateMetadata` and the page body share one request)                                               |
   | `listProducts` / `getProduct` / `getCatalogStats` (wired)    | `GET /api/v1/admin/products/?search=&category=&status=&promo=&out_of_stock=&is_new=&ordering=&page=&page_size=8`, `products/{id}/`, `products/stats/` |
   | `getCategories` (wired)                                      | `GET /api/v1/admin/categories/?page_size=50` (every page, bounded, ordered by position)                                                               |
   | `getBanners` (wired)                                         | `GET /api/v1/admin/banners/?page_size=50` (every page, bounded, ordered by position)                                                                  |
   | `getJob` (wired, polled by `pollJob`)                        | `GET /api/v1/admin/jobs/{id}/`                                                                                                                        |
   | `listCustomers` / `getCustomer` (wired)                      | `GET /api/v1/admin/customers/?search=&status=&segment=&ordering=&page=&page_size=20\|50`, `customers/{id}/` (`cache()`, 404 → `null`)                 |
   | `getCashbackSettings` (wired)                                | `GET /api/v1/admin/cashback/policy/` (active, scheduled, every version, `next_effective_from`)                                                        |
   | `getNotificationsOverview` (wired)                           | `GET /api/v1/admin/notifications/meta/` + `notifications/?page_size=20` (first page, ordered by the backend)                                          |
   | `getAppointmentDay` / `getPendingAppointments` (wired)       | `GET /api/v1/admin/appointments/?date=YYYY-MM-DD` (default day = today in Tashkent from the server clock), `appointments/pending-summary/`            |
   | `getBookingMeta` (wired)                                     | `GET /api/v1/admin/appointments/meta/` (active specialists with their services, duration, price, slot step)                                           |
   | `listSegments` / `getSegment` / `listSegmentMembers` (wired) | `GET /api/v1/admin/segments/?page=`, `segments/{id}/`, `segments/{id}/members/?page=` (pages of 20)                                                   |
   | `getSettings` / `getStaffAccount` (wired)                    | `GET /api/v1/admin/settings/`, `auth/me/`                                                                                                             |
   | `listAuditLog` (wired)                                       | `GET /api/v1/admin/audit-log/?actor=&action=&object_type=&object_id=&date_from=&date_to=&ordering=&page=&page_size=20`                                |
   | `listStaff` (wired, audit-log actor filter)                  | `GET /api/v1/admin/staff/?page_size=100` (active staff, every page, bounded)                                                                          |
   | `listSegmentOptions` (wired, customers group filter)         | `GET /api/v1/admin/segments/?page_size=50` (every page, bounded)                                                                                      |
   | `getNavCounts` (wired, `cache()` per request)                | `GET /api/v1/admin/nav-counts/` (sidebar pills; `null` → no pills on any API failure)                                                                 |
   | `getDashboard` / `getRecentOrders` (wired)                   | `GET /api/v1/admin/dashboard/?range=today\|week\|month\|custom&from=&to=` (400 on `from`/`to` → field errors), `orders/?page_size=6`                  |
   | `listPayments` (wired)                                       | `GET /api/v1/admin/payments/?status=&provider=&refund_state=&period=&date_from=&date_to=&search=&ordering=&page=&page_size=`                          |

2. **Map responses in the data layer, not in components.**
   - Convert DRF's `{count, next, previous, results}` to `Page<T>` (`mapPage`).
   - Convert snake_case to camelCase per path segment (`camelKey`, `mapFieldPath`).
   - Keep money as integer so‘m and datetimes as ISO strings with offset.
   - Domain types in `src/domain` are the contract. 404 → `null`.

3. **Mutations are Server Actions** (`src/data/*.actions.ts`, `"use server"`). Signature convention: **ids + the change + the client's idempotency `key` + the `csrf` token**, e.g. `cancelOrder(orderId, reason, key, csrf)`, `saveCashbackPolicy(draft, key, csrf)`, `sendNotification(formData, key, csrf)`; the product image calls take no key (`uploadProductImage(productId, formData, csrf)`); `saveProduct(id, values, baseline, key, csrf)` and `saveBanner(id, formData, baseline, key, csrf)` also take the values the editor loaded, so an update sends only what the admin changed. Every action:
   - calls `guardAction(csrf)` → `verifyStaff({ csrf })`, answering `{ ok: false, code: "session_expired" | "csrf" }`; the guard refuses a missing or empty token before touching the session (action arguments are attacker-controlled, the TypeScript signature does not exist at runtime);
   - re-validates its input with zod (`productFormSchema` and the per-action schemas) and returns `fieldErrors` keyed by the form's field names; the key must be a UUID;
   - dispatches on `dataSource()`: the mock body in `src/data/mock/<resource>.actions.ts` looks the object up by id and applies the demo transformation; the api branch runs through `apiMutation(name, call)`, which calls `refresh()` from `next/cache` after a success (mock mode skips it — the fixtures never change, so a re-render would only discard the client's local state). Until F2 wires an endpoint, the api branch answers "Bu amal API bilan hali ulanmagan.";
   - maps a DRF `400` to `fieldErrors` with `toActionResult` and the per-action remaps (`audience.phone` → `phone`, `billz_id` → `billzId`, `image` → top-level error).

   The shell actions (F2b) are wired: `updateAppointment` posts `appointments/{id}/{confirm|reject|attend}/` with the board's key; `createAppointment` / `rescheduleAppointment` / `cancelAppointment` post the T10 admin endpoints with a key per dialog (kept across re-opens until a success) and build `start` from the dialog's Tashkent date and time; `start` errors and a 409 `conflict` race ("Bu vaqt band.") come back on the `time` field, `customer_id`/`phone` errors on `phone`; a reschedule sends `specialist_id` only when it changed. `loadAppointmentDay(date)` is a read through a Server Action (no key, no refresh) for the booking dialog when another date is picked. `sendNotification` builds the multipart body with dotted keys from the validated input (`notificationFormData`: `group` → `segment`, `one` → `customer`, `scheduled_at` as an aware Tashkent time) and remaps per §7.1; `updateNotificationTemplate` PUTs all three languages (the backend owns the `{raqam}` rule). Groups: `createSegment`, `updateSegment(id, values, baseline, …)` (only the changed name and the changed rule(s)), `deleteSegment` (409 while a scheduled campaign targets it), `addSegmentMembers` (see the customers paragraph below), `removeSegmentMember` (409 for a rule-only member). `updateSettings(values, baseline, …)` PATCHes only the changed fields (`pickup_address` as leaves, an emptied phone as `null`); `changePassword` posts `auth/change-password/` without a key and without a refresh (the other sessions are revoked, this one stays). "Boshqa qurilmalardan chiqish" posts the logout route with `scope=others`; the route answers `/admin/settings?others=ok|failed` and the account card toasts the outcome (a 401 ends this session too). Every form passes a failure through `partitionFieldErrors` (`features/admin/shared/field-errors.ts`): errors on rendered fields go next to them, the rest (e.g. `link.product_id` for a product hidden after the page loaded, `service_id` on a move) become the form-level message, so no backend error is dropped. The export download treats an HTML answer or a redirect onto `/admin/login` (the proxy's expired-session chain) as a 401. The phone mask (`lib/phone.ts`) drops the "+998" it writes itself before reading digits, so typing key by key and backspacing keep the number.

   The catalog actions are wired: `saveProduct` creates hidden (`POST products/`, JSON, with the editor's idempotency key so a lost answer is replayed with the id) or sends a diff against the editor's baseline — never against a fresh read, so another admin's concurrent change to a field this admin did not touch survives — with `texts` as changed leaves (`{texts: {uz: {description: "…"}}}`; the server merges leaves) and `billz_id` only when it changed (`PATCH products/{id}/`), the image actions post multipart `file`, `DELETE` and `PUT …/images/order/`, `importFromBillz` posts `integrations/billz/import/` and the client polls `pollJob` (`GET jobs/{id}/`) every 1.5 s (a transport blip is retried with 1.5 → 3 → 6 → 12 s backoff; when the poller gives up the control is released and the route refreshed, since the job keeps running server-side and a re-click returns it); the category and banner actions follow §2.4 and §2.5 (banners are multipart with dotted keys, JSON when no new image; an update carries only the changed fields, so an unchanged link to a since-hidden product is not resent and re-checked). Field errors come back on the form's names (`billzId`, `texts.uz.name`, `images`, `link.productId`, …).

   <!-- F2c: customers and cashback -->

   The customers and cashback actions (F2c) are wired. `adjustCashback(customerId, input, key, csrf)` posts `customers/{id}/cashback-adjustments/` with the dialog's key (one per dialog instance, renewed after a success or a 422) and returns `{entry, balance, available}`; `amount`, `reason` and `direction` errors land on the dialog's fields, `insufficient_balance` on `amount` ("Balansdan ko‘p ayirib bo‘lmaydi."), anything else in the toast; the route refreshes, so the card shows the server's balance and the new ledger row (deduplicated against the local row), and a ref guards the submit, so a double click posts once. The editor starts from, and "O‘zgarishlarni bekor qilish" restores, the latest saved version — the scheduled one when there is one, else the active one (`editorBaseline`, named in the header) — the same before and after a reload. `saveCashbackPolicy(draft, key, csrf)` posts `cashback/policy-versions/` with `effective_from` (default `next_effective_from`, choice of the next three month starts), the tiers in the editor's order and each percent as a two-decimal string from integer basis points (`1.5` → `"1.50"`; more decimals are refused before the call); `tiers.{i}.from|to|percent` errors are shown on row `i`, `effectiveFrom` (`effective_from_in_past`) under the date, and the 201 `warnings` (gap, uncovered top) as a toast; the action re-reads the policy once to return the new history row, and the toast names the superseded scheduled version. History rows follow §5.4: the summary diffs `(from, to, percent)` against the previous non-superseded version (`policySummary`, NBSP-safe `tierRange`), the period comes from `effective_from`/`effective_to`/`state` (`policyPeriod`); the preview and the mock credit use `(eligible × bp) // 10000` (`basisPoints`, `applyBasisPoints`), pinned by the backend's 0.57 / 2.3 / 1.5 % vectors in `src/domain/cashback.test.ts`. `addSegmentMembers(id, entries, key, csrf)` takes the dialog's lines (one customer id or phone each, ≤500; a pasted list is split on commas, semicolons and new lines — never spaces, so "90 123 45 67" stays one phone — and inserted at the caret, keeping the line's own text; lines beyond 500 are counted in the form message, never dropped silently, `pasteMemberLines`), normalises spaced national or international phones to E.164 and sends `{customer_ids, phones}` (only the non-empty lists, deduplicated); `phones.{i}` / `customer_ids.{i}` come back on the line that named that element (`entries.{line}`), list-level errors as the form message. The customers list keeps `q`, `status`, `group`, `sort`, `size` and `page` in the URL; `customerListParams` renames them to `search`, `segment`, `ordering` and `page_size` (an invalid group id or size is dropped before the call), and the `mijozlar` export reuses the same filters; control characters are removed from `q` before the call (`parseSearchParam`; a NUL would be a Django 400), and the group options are optional (`optionalRead`: a failed `GET segments/` leaves "Hammasi" and the current `#id`, the rows still render). The card maps the contract shape (§5.3): totals by channel, online-order stats, tier and next tier, balance / held / available, groups, upcoming appointments, device, the full ledger with `balance_after`, order links, promo-excluded notes and the credit's policy version, and the purchases with order links and the reversal flag; a deleted customer shows "O‘chirilgan mijoz" with the deleted state and a read-only card (no adjustment and no notification button, `canAdjustCashback`; the backend itself would still accept an adjustment, §2.6); the balance note only explains the hold (`balanceNote`), since the balance is the server's value, not the ledger sum. The audit-log actor filter lists `GET staff/` (falling back to the signed-in member and the page's actors when the directory cannot be read).

   <!-- BEGIN F2d: orders, payments, dashboard -->

   The order, payment and dashboard flows (F2d) are wired. `cancelOrder(orderId, reason, key, csrf)`, `changeOrderStatus(orderId, status, key, csrf)` and `retryShipment(orderId, key, csrf)` post `orders/{id}/cancel|transition|retry-shipment/` with the dialog's (or button's) key and answer the mapped `Order`; the detail screen takes its buttons from `available_actions` (the mock fixtures derive the same object with `orderActions()`), so a status menu only offers the allowed targets. A retry answered 202 (`shipment.pending`) disables the button ("BTS ga yuborilmoqda…") and re-reads the order through `loadOrder(orderId, csrf)` every 2 s, at most 15 times, until the shipment is no longer pending (`pollShipment`, `features/admin/orders/shipment-poll.ts`, aborted on unmount; a page loaded while a create is in flight polls too). Refusals come back with the backend's code and message and show as the "Amal bajarilmadi" toast: 409 `not_cancellable` (incl. "BTS buyurtmani bekor qilmadi: posilka kuryerda."), `invalid_transition`, the busy-order `conflict`, 503 `provider_unavailable`; a refusal that means the order changed (`invalid_transition`, `not_cancellable`, 404) re-reads it, a transient one keeps the dialog and its key for a retry; a `reason` error stays on the field. A cancel never flips the payment to `refunded`: the payment card shows the refunds newest first with the §5.1 state line ("Qaytarish so‘raldi", "Payme kabinetida qaytarish kerak", …). The history is folded in the mapper (§4/§5.1, pinned by the №10248 vector). Item photos are the checkout snapshots; a URL whose host is not in `GLOWDERMA_MEDIA_HOSTS` is dropped by the server (`src/data/api/media.ts`), since `next/image` would throw on it, and the row keeps its empty frame.

   Payments (`/admin/payments`): `retryRefund(paymentId, refundId, key, csrf)` and `resolveRefund(paymentId, refundId, state, key, csrf)` post `payments/{id}/refunds/{refund_id}/retry|resolve/` (the key is optional on the API but always sent: one per payment, refund and operation, kept until a success or a 422 reuse) and answer the payment row, which replaces the row at once. Retry is offered for a `failed` refund of a `paid` payment, "Qaytarildi / Bajarilmadi deb belgilash" for `unknown` / `manual_required`, each behind a confirmation dialog; 409 `invalid_transition` / `conflict` show the backend's message. The "Harakat kerak" refund filter is the dashboard's `refunds_needing_action` (failed, unknown, manual_required): the API filters one `refund_state` at a time, so the data layer reads those three lists (bounded by `collectAllPages`), merges them newest first and pages locally; that view has no export.

   Dashboard (`/admin`): `?range=today|week|month` or `?range=custom&from=&to=` ("Tanlash" dialog). The dialog checks the backend's rules first with its messages (`validateCustomRange`: a missing day "Majburiy maydon.", `from > to` or an end after today or more than 366 days "Noto‘g‘ri qiymat.", today from the server clock); the API's 400 on `from`/`to` still comes back as field errors, and an invalid range shows today's numbers with the dialog open on the errors. Buckets, labels, axis and the previous-period note follow §5.7 (a two-day custom range keeps all 48 hours, labelled with the day). Attention links: BTS failures → `/admin/orders?status=processing&fulfilment=delivery&period=all` (there is no shipment filter on `orders/`), pending visits → `/admin/appointments`, Billz → `/admin/products?new=1`, refunds needing action → `/admin/payments?refund=needs_action`, out of stock → `/admin/products?out=1`.

   <!-- END F2d -->

   Client components call actions through `runAction` (`src/features/admin/shared/action-client.ts`): it supplies the `gd_csrf` cookie and, on `code: "session_expired"`, GETs `/admin/auth/refresh?next=…` once (same-origin fetch, `redirect: "manual"`) and retries; if still expired it goes to `/admin/login?next=…`. A rejected action call (dropped connection, Next's "Invalid Server Actions request", an exception inside the action) comes back as `{ ok: false, code: "network_error" }`, so the call sites' "Amal bajarilmadi" toast handles it and the kept key gets its replay. Idempotency keys come from `useIdempotencyKey()`: one UUID per dialog/form instance, reused on retries and re-opens, renewed after a success or a 422 `idempotency_key_reused`. The product editor orchestrates a save (`persistProduct`, `src/features/admin/products/persist-product.ts`) as create (hidden) or patch → delete removed images → upload new files → save the order (only when it differs from the server's) → activate → redirect on create. Deletes run before uploads so swapping a photo of a product with 8 never exceeds the limit; an active product whose every image is replaced keeps one old image until the first upload lands, so it is never hidden or left imageless. Progress survives a failed step (uploaded files, the server's image ids, the values the server now holds), so a retry neither re-uploads, re-deletes nor re-creates. Forms guard their submit handler synchronously (a ref), so a double click or Enter repeat sends one request.

   Exports: the "Eksport" menu fetches `/admin/<section>/export?…&format=csv|xlsx` and saves the blob; a refusal (429 throttled, 400 `export_too_large`, 401, 502) shows the envelope's message in the "Amal bajarilmadi" toast instead of navigating to JSON. The route handlers stream Django's body with a header-only 60 s deadline (a long transfer is not cut off) and cancel the upstream fetch when the browser abandons the download. An unknown `category` slug in the products URL (a stale bookmark) is dropped before the API call on the board and in the export, in both modes.

4. **Auth.** The staff session is a BFF: tokens live in HttpOnly cookies and only the Next server calls Django. Read it inside each page's data boundary (`requireStaff()` in the `*-content.tsx` components) and in every Server Action, never in a layout. `requireStaff()` sends an expired access cookie to the refresh route and a missing session to the login page.

5. **Deployment assumption.** The Next server is reachable only through a single trusted edge (see the note under Environment): it writes the rightmost `X-Forwarded-For` hop and overwrites `X-Forwarded-Host`, production serves HTTPS, and Django's admin API accepts only Bearer + internal secret from this server.

6. **Remove demo affordances** once every resource is wired: the "Demo ma’lumotlar" pill already hides itself in api mode; `referenceNow()` is used only inside `src/data/mock/**` (server code uses `requestNow()`, content components pass `now` down as a prop); wire the "not connected" buttons once those flows are designed.

7. **Fill site links.** Set the App Store, Google Play, Telegram, Instagram, phone and policy URLs in `src/config/site.ts`. Until then they point back to an on-page anchor.

---

## Verification

All checks were run on the final commit in this environment (Linux, Chromium via Playwright).

| Check                                                   | Result                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                          | 0 errors, 0 warnings                                                                                                                                                                                                                                                                      |
| `npm run typecheck`                                     | passes (strict, `noUncheckedIndexedAccess`, typed routes)                                                                                                                                                                                                                                 |
| `npm run test`                                          | 18/18 tests pass (cashback rules; mock dataset matches the design's numbers)                                                                                                                                                                                                              |
| `npm run format:check`                                  | passes                                                                                                                                                                                                                                                                                    |
| `npm run build`                                         | succeeds. Landing pages ○ static; admin lists and details ◐ partial prerender; placeholders ○; CSV export ƒ                                                                                                                                                                               |
| Landing vs reference, 1440 and 1280                     | Pixel bands identical; page heights match (6750 / 6391 px)                                                                                                                                                                                                                                |
| Landing at 1024, 768, 390                               | Matches except intentional changes (see deviations)                                                                                                                                                                                                                                       |
| Admin vs reference, 1440 (all 9 boards)                 | Same layout and heights. Remaining differences: the demo pill, the sticky sidebar in full-page captures, ~0.6 px sub-pixel offset                                                                                                                                                         |
| Admin at 1024 (all 9 boards)                            | Identical page heights; 0.6–1.5 % pixel difference (anti-aliasing, demo pill)                                                                                                                                                                                                             |
| Admin at 768                                            | Reference stacks the sidebar above the content; this build uses a drawer (intentional)                                                                                                                                                                                                    |
| Horizontal overflow                                     | None on any page at 390 / 768 / 1024 / 1440. The reference overflows on Orders and Products at 1024                                                                                                                                                                                       |
| axe-core 4.10 (WCAG 2.0/2.1/2.2 A + AA, best practices) | 0 violations on all 12 checked pages at 1440 and 390. Also clean with the status menu, cancel dialog, mobile drawer, tablet menu and an invalid adjustment form open. Kategoriyalar and Bannerlar (added in F2a, reorder targets 32×32 px) were checked separately after the F2a fix pass |
| Keyboard                                                | Skip link, focus trap and Escape in dialogs, focus return to the opener (or to the heading/visit when the opener disappears), arrow keys in tabs, menus and radio groups, first invalid field focused (switching language tab if needed)                                                  |
| Reduced motion                                          | Animation and transition durations ≈ 0 and smooth scrolling off under `reduce`; normal under `no-preference`                                                                                                                                                                              |
| Fonts                                                   | Latin preloaded; Cyrillic served via `unicode-range` for `/ru`                                                                                                                                                                                                                            |
| HTTP                                                    | Unknown URLs → 404 with branded page; `/uz` → 308 to `/`                                                                                                                                                                                                                                  |

**Not verified:**

- Real screen readers (NVDA, JAWS, VoiceOver).
- Safari, Firefox and physical mobile devices; only Chromium was used.
- Lighthouse or performance budgets.
- The dark theme (tokens exist but are not applied).
- A committed end-to-end test suite. Interaction checks were run as ad-hoc Playwright scripts.

---

## Limitations and mock functionality

**Data**

- All data comes from `src/data/mock` (248 products, 1 284 orders, 432 customers, one appointment week).
- Mutations go through Server Actions whose mock bodies derive the next state from the fixtures by id and return it; the client keeps it in local state only. Because nothing is persisted, a second mutation on the same object starts again from the fixture (e.g. a status change followed by a cancellation yields the fixture's history plus the cancellation row).

**Admin access**

- In mock mode `/admin` is open (no sessions); in api mode `/admin/login` signs staff in against Django and the proxy refreshes the access cookie. `/admin` sends `noindex` headers and `robots.txt` disallows it.

**Behaviour**

- An unknown id such as `/admin/orders/999` shows the "not found" view, but the HTTP status is 200. The body streams under Partial Prerendering. It will be 404 once data checks move before streaming or the route is made dynamic.
- Actions without a design show an explicit notice:
  - linking and unlinking Google / Facebook on the account card (the OAuth start route is not built)
- The admin booking dialogs (new visit, reschedule / move, cancel) are built in the design system without a board. The time list is the 5-minute grid inside the chosen specialist's working hours of the chosen day; starts that collide with a break or a held visit are marked "band" but stay selectable, since the backend decides. In demo mode a visit created in the dialog lives only in the page's state, so it cannot be moved or cancelled afterwards (the mock actions look visits up in the fixtures).
- The header search still opens the filtered orders list (it is not a global search).
- Disabled with an explanation: weekly appointment view, "AI tahlil" (phase 2).
- Sections that are not in the design, built in the design system without a board: Guruhlar (`/admin/customers/groups`, members at `/admin/customers/groups/[id]`), Sozlamalar (store settings + account card) and Harakatlar jurnali (`/admin/audit-log`) (F2b); Kategoriyalar and Bannerlar (list ordered by position, create/edit dialogs, delete confirmation, up/down reordering, CSV/XLSX export) (F2a); the customers list (F2c) and To‘lovlar (F2d). No placeholder section is left.
- Customers and cashback (F2c): the customers list (`/admin/customers`: search, status, group, ordering, 20/50 rows, export) is built in the design system without a board. The adjustment dialog checks the amount against the card's `available` before calling (the backend re-checks under its lock); the policy editor offers the next three month starts as the effective date, so `effective_from_in_past` only appears when a page is left open across a month boundary. In demo mode six generated customers without online orders are deleted (as in the seed), the mock policy save returns v4 with the backend's summary, period and warnings without persisting it, and the group dialog resolves phones against the fixtures.

<!-- BEGIN F2d: orders, payments, dashboard -->

- To‘lovlar (`/admin/payments`) is built in the design system without a board (filters, table, refund operations, CSV/XLSX export). In demo mode three older cancelled orders keep a refund that needs action (Click `failed`, Click `unknown`, Payme `manual_required`), so the operations have rows; the dashboard's attention block therefore shows a fourth item ("3 ta qaytarish tekshiruv kutmoqda") that the board does not draw. Demo refund operations, like every mock mutation, are not persisted.
- In demo mode a BTS retry answers with the created parcel at once (there is no outbox); with the API the screen polls up to 30 s and then asks for a reload.
- The seeded backend snapshots order item photos as `http://127.0.0.1:8000/media/…`, a host that does not serve them: those rows show the empty frame (reported as a backend defect).
- Busy-order 409s and 503 `provider_unavailable` cannot be produced with the fake providers from the UI; they are covered by unit tests of the actions.

<!-- END F2d -->

- The Billz import runs as a job: in demo mode it finishes on the first poll with fixed counts; nothing changes in the fixtures.
- Exports (`/admin/<section>/export?format=csv|xlsx`): api mode streams Django's file (CSV or XLSX) with its filename; demo mode builds a local CSV from the fixtures for either format.

**Content**

- Russian and English landing copy are drafts that need native review.
- Store, social, phone and policy links are not provided yet.

**Design inconsistencies and open questions**

These are kept as drawn or resolved as noted:

- Order №10248 shows cashback "1% × 568 000 = 5 680". Under the board's own rule ("cashback-paid part earns nothing"), the base would be 519 400. The record is kept as drawn.
- The backend notes ask whether the first tier is 0–10 mln or 0–20 mln. The admin spec (20 mln) is used.
- Cancelling parcels already handed to the courier is an open question on the board. Cancellation is allowed until delivered.
- The appointment "To‘lov" row is a placeholder in the design ("[Oldindan to‘lov qoidasi]"). It is shown as "Qoida hali belgilanmagan".
- The products board marks NOMI as sorted although its rows are not alphabetical. The default order is the catalog order, the icon is muted until a sort is chosen, and clicking cycles A–Z, Z–A, default.

**Intentional deviations from the design**

- **Responsive layout**:
  - The admin sidebar becomes a drawer below 1024 px, and it is sticky on desktop.
  - The landing header collapses into a menu between 600 and 1152 px instead of wrapping.
- **Contrast fixes for WCAG AA**:
  - Destructive buttons use a slightly deeper red (#c93b3b, 5.0:1 with white).
  - Menu hints and the selected audience card switch to ink text.
- **Behaviour**:
  - Submit buttons stay enabled and show validation errors instead of being disabled.
  - Sending a push "now" asks for confirmation, and so does rejecting an appointment.
- **Small additions**:
  - "Yana N ta yozuv" on the cashback ledger.
  - A chevron on the effective-date picker.
  - Shared pagination (1 2 3 … N) on Products, which the board draws as 1 2 … N.
