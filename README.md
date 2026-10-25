# Glow Derma — web frontend

The Glow Derma web frontend, built from the Claude Design board "Glow Derma". It contains:

- the **public landing page** in Uzbek (`/`), Russian (`/ru`) and English (`/en`);
- the **admin panel** (`/admin`): dashboard, orders, order detail, products, product editor, customer card, cashback settings, notifications and appointments.

It runs on **mock data** behind a small data layer. That layer has the same shape as the planned Django REST Framework API, so connecting the backend replaces function bodies without touching the UI.

> **Demo mode:** admin mutations are simulated on the client and are not saved. A reload restores the dataset, and every admin page shows a "Demo ma’lumotlar" marker. Nothing is sent to customers, Billz, BTS, Click/Payme or Firebase.

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

| Variable               | Purpose                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, Open Graph, `sitemap.xml` and `robots.txt`. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`. |

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
                             (page header, status badges, URL state, pagination, skeletons)
  domain/                    Framework-free types and business rules (orders, cashback tiers,
                             products, appointments, notifications). Unit-tested.
  data/                      The seam to the backend:
    *.ts                       server-only queries (`getOrder`, `listProducts`, …)
    *.actions.ts               mutations returning ActionResult<T>
    *.schema.ts                Zod schemas shared by forms and (later) Server Actions
    mock/                      deterministic fixtures that reproduce the design's numbers
    config.ts                  DATA_SOURCE switch, demo clock
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

1. **Switch the source.** Set `DATA_SOURCE` in `src/data/config.ts` to `"api"`, and replace each function body in `src/data/*.ts` with a `fetch` to the documented endpoint. Every function has a JSDoc line naming its endpoint:

   | Function                              | Endpoint                                                                                 |
   | ------------------------------------- | ---------------------------------------------------------------------------------------- |
   | `listOrders` / `getOrderStatusCounts` | `GET /api/v1/admin/orders/?status=&search=&fulfilment=&payment=&period=&ordering=&page=` |
   | `getOrder`                            | `GET /api/v1/admin/orders/{id}/`                                                         |
   | `listProducts`                        | `GET /api/v1/admin/products/?search=&category=&status=&promo=&out_of_stock=&page=`       |
   | `getCustomer`                         | `GET /api/v1/admin/customers/{id}/`                                                      |
   | `getCashbackSettings`                 | `GET /api/v1/admin/cashback/policy/`                                                     |
   | `getNotificationsOverview`            | `GET /api/v1/admin/notifications/`                                                       |
   | `getAppointmentDay`                   | `GET /api/v1/admin/appointments/?date=YYYY-MM-DD`                                        |
   | `getDashboard`                        | `GET /api/v1/admin/dashboard/?range=today\|week\|month`                                  |

2. **Map responses in the data layer, not in components.**
   - Convert DRF's `{count, next, previous, results}` to `Page<T>`.
   - Convert snake_case to camelCase.
   - Keep money as integer so‘m and datetimes as ISO strings with offset.
   - Domain types in `src/domain` are the contract.

3. **Mutations.** Turn each `*.actions.ts` function into a Server Action (`"use server"`) that:
   - re-validates with the same Zod schema;
   - calls the endpoint named in the file header;
   - maps DRF `400` field errors to `fieldErrors`;
   - calls `revalidatePath`/`updateTag` for the affected list.

   Signatures stay the same. Product images become `multipart/form-data`: new files plus the ordered list of existing image ids.

4. **Auth.** Read the staff session (cookie or JWT) inside each page's data boundary and in every Server Action, never in a layout. Layouts are shared and must not block on the request. Then add a login route and redirect unauthenticated users.

5. **Remove demo affordances.**
   - Drop the "Demo ma’lumotlar" pill (`IS_DEMO`).
   - Replace `referenceNow()` with the request time.
   - Wire the "not connected" buttons once those flows are designed.

6. **Fill site links.** Set the App Store, Google Play, Telegram, Instagram, phone and policy URLs in `src/config/site.ts`. Until then they point back to an on-page anchor.

---

## Verification

All checks were run on the final commit in this environment (Linux, Chromium via Playwright).

| Check                                                   | Result                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                          | 0 errors, 0 warnings                                                                                                                                                                                                                     |
| `npm run typecheck`                                     | passes (strict, `noUncheckedIndexedAccess`, typed routes)                                                                                                                                                                                |
| `npm run test`                                          | 18/18 tests pass (cashback rules; mock dataset matches the design's numbers)                                                                                                                                                             |
| `npm run format:check`                                  | passes                                                                                                                                                                                                                                   |
| `npm run build`                                         | succeeds. Landing pages ○ static; admin lists and details ◐ partial prerender; placeholders ○; CSV export ƒ                                                                                                                              |
| Landing vs reference, 1440 and 1280                     | Pixel bands identical; page heights match (6750 / 6391 px)                                                                                                                                                                               |
| Landing at 1024, 768, 390                               | Matches except intentional changes (see deviations)                                                                                                                                                                                      |
| Admin vs reference, 1440 (all 9 boards)                 | Same layout and heights. Remaining differences: the demo pill, the sticky sidebar in full-page captures, ~0.6 px sub-pixel offset                                                                                                        |
| Admin at 1024 (all 9 boards)                            | Identical page heights; 0.6–1.5 % pixel difference (anti-aliasing, demo pill)                                                                                                                                                            |
| Admin at 768                                            | Reference stacks the sidebar above the content; this build uses a drawer (intentional)                                                                                                                                                   |
| Horizontal overflow                                     | None on any page at 390 / 768 / 1024 / 1440. The reference overflows on Orders and Products at 1024                                                                                                                                      |
| axe-core 4.10 (WCAG 2.0/2.1/2.2 A + AA, best practices) | 0 violations on all 12 checked pages at 1440 and 390. Also clean with the status menu, cancel dialog, mobile drawer, tablet menu and an invalid adjustment form open                                                                     |
| Keyboard                                                | Skip link, focus trap and Escape in dialogs, focus return to the opener (or to the heading/visit when the opener disappears), arrow keys in tabs, menus and radio groups, first invalid field focused (switching language tab if needed) |
| Reduced motion                                          | Animation and transition durations ≈ 0 and smooth scrolling off under `reduce`; normal under `no-preference`                                                                                                                             |
| Fonts                                                   | Latin preloaded; Cyrillic served via `unicode-range` for `/ru`                                                                                                                                                                           |
| HTTP                                                    | Unknown URLs → 404 with branded page; `/uz` → 308 to `/`                                                                                                                                                                                 |

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
- Mutations update local state only: order cancellation, status change, BTS retry, product save, cashback adjustment, policy version, push send, appointment actions.

**Admin access**

- No authentication; `/admin` is open. It sends `noindex` headers and `robots.txt` disallows it.

**Behaviour**

- An unknown id such as `/admin/orders/999` shows the "not found" view, but the HTTP status is 200. The body streams under Partial Prerendering. It will be 404 once data checks move before streaming or the route is made dynamic.
- Actions without a design show an explicit notice:
  - Billz import
  - logout
  - custom dashboard date range
  - new appointment, reschedule and move
- Disabled with an explanation: weekly appointment view, "AI tahlil" (phase 2).
- Placeholder sections, which are not in the design: Kategoriyalar, Bannerlar, To‘lovlar, Sozlamalar and the customer list. The customer list links to a sample card.

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
