import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Test-only access to the backend's fake-provider switches through its
 * management shell (`uv run python manage.py shell`), for outcomes no API
 * exposes: the admin API cannot set `Order.metadata.fake` (design 03 §1.3).
 * Used only by the e2e specs, never by `src/`.
 *
 * `E2E_BACKEND_DIR` is the backend checkout (the directory with
 * `manage.py`); unset, the specs that need it are skipped. Its `.env` is
 * loaded into the shell's environment (Django reads `os.environ` only),
 * nothing of it is printed. The backend must run with fake integrations
 * and `CELERY_TASK_ALWAYS_EAGER` (the local settings), so a cancel tries
 * the Click refund at once.
 */
export const BACKEND_DIR = process.env.E2E_BACKEND_DIR;

/** Reads `KEY=VALUE` lines of the backend's `.env` (no expansion, quotes stripped). */
function backendEnv(dir: string): Record<string, string> {
  const file = join(dir, ".env");
  if (!existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    env[match[1]!] = match[2]!.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}

/** Runs `code` in the backend's Django shell and returns its stdout. */
function djangoShell(code: string): string {
  if (!BACKEND_DIR) throw new Error("E2E_BACKEND_DIR is not set");
  return execFileSync("uv", ["run", "python", "manage.py", "shell", "-c", code], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...backendEnv(BACKEND_DIR) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
}

/**
 * The fake Click's scenario of one order (`Order.metadata.fake.click`):
 * `refund: "failed"` makes its refund fail; `status` forces what Click's
 * status check answers (`"paid"`, `"reversed"`, `"down"`), else it answers
 * "paid" until a refund reversed the payment.
 */
export interface FakeClickScenario {
  refund?: "succeeded" | "failed" | "unknown" | "down";
  status?: "paid" | "reversed" | "down";
}

/** Sets `Order.metadata.fake.click` of `orderId`, keeping the rest of its metadata. */
export function setFakeClickScenario(orderId: number, scenario: FakeClickScenario): void {
  const code = [
    "import json",
    "from glowderma.commerce.models import Order",
    `order = Order.objects.get(pk=${Number(orderId)})`,
    "metadata = order.metadata if isinstance(order.metadata, dict) else {}",
    "fake = metadata.get('fake') if isinstance(metadata.get('fake'), dict) else {}",
    `fake['click'] = json.loads(${JSON.stringify(JSON.stringify(scenario))})`,
    "metadata['fake'] = fake",
    "order.metadata = metadata",
    "order.save(update_fields=['metadata'])",
    "print(json.dumps(order.metadata['fake']['click']))",
  ].join("\n");
  const answer = djangoShell(code).trim().split("\n").at(-1) ?? "";
  if (JSON.stringify(JSON.parse(answer)) !== JSON.stringify(scenario)) {
    throw new Error(`the backend did not store the Click scenario of order ${orderId}: ${answer}`);
  }
}

/**
 * Removes Click's payment id (`Payment.provider_state.click_paydoc_id`) from
 * the order's Click payment, as on a seeded or legacy payment. A refund of
 * it is then manual from the start (`Refund.manual_reason` `no_paydoc`), and
 * closing a failed one cannot ask Click (409 `conflict`, M3).
 */
export function dropClickPaydoc(orderId: number): void {
  const code = [
    "import json",
    "from glowderma.payments.models import Payment",
    `payments = list(Payment.objects.filter(order_id=${Number(orderId)}, provider='click'))`,
    "for payment in payments:",
    "    state = dict(payment.provider_state or {})",
    "    state.pop('click_paydoc_id', None)",
    "    payment.provider_state = state",
    "    payment.save(update_fields=['provider_state'])",
    `left = Payment.objects.filter(order_id=${Number(orderId)}, provider='click', provider_state__has_key='click_paydoc_id').count()`,
    "print(json.dumps({'payments': len(payments), 'left': left}))",
  ].join("\n");
  const answer = JSON.parse(djangoShell(code).trim().split("\n").at(-1) ?? "{}");
  if (!(answer.payments > 0) || answer.left !== 0) {
    throw new Error(
      `the backend kept a Click payment id on order ${orderId}: ${JSON.stringify(answer)}`,
    );
  }
}

/**
 * Processing Click orders whose paid Click payment still carries Click's
 * payment id, newest first. The Click specs take their order from these
 * only: an order a stopped run left without the id (between
 * `dropClickPaydoc` and its cancel) would give a `no_paydoc` refund instead
 * of a failed one and break every later run until `seed_demo --reset`.
 */
export function clickOrdersWithPaydoc(): number[] {
  const code = [
    "import json",
    "from glowderma.commerce.models import Order",
    "ids = (Order.objects.filter(status='processing', payment_provider='click', payments__provider='click',",
    "      payments__status='paid', payments__provider_state__has_key='click_paydoc_id')",
    "      .order_by('-pk').values_list('pk', flat=True).distinct())",
    "print(json.dumps(list(ids)))",
  ].join("\n");
  const answer: unknown = JSON.parse(djangoShell(code).trim().split("\n").at(-1) ?? "[]");
  if (!Array.isArray(answer) || !answer.every((id) => Number.isInteger(id))) {
    throw new Error(`the backend did not list Click orders: ${JSON.stringify(answer)}`);
  }
  return answer as number[];
}

/**
 * Moves the spec's scheduled campaign `title` to `from` → `to` (`queued`:
 * its send started, as the beat does when it is due; `scheduled`: back
 * again), so the board meets the backend's 409 on "Bekor qilish". Nothing is
 * sent: no task is queued for it.
 */
export function setCampaignState(
  title: string,
  from: "scheduled" | "queued",
  to: "scheduled" | "queued",
): void {
  const code = [
    "import json",
    "from glowderma.notifications.models import Campaign",
    `title = json.loads(${JSON.stringify(JSON.stringify(title))})`,
    `changed = Campaign.objects.filter(title=title, state='${from}').update(state='${to}')`,
    "print(json.dumps({'changed': changed}))",
  ].join("\n");
  const answer = JSON.parse(djangoShell(code).trim().split("\n").at(-1) ?? "{}");
  if (answer.changed !== 1) {
    throw new Error(`the backend moved ${JSON.stringify(answer)} campaigns «${title}» to ${to}`);
  }
}

/* --- Gap closure specs: arrange and clean up what no API can (test-only) --- */

/** The last line of a shell run, parsed as JSON. */
function shellJson<T>(code: string): T {
  return JSON.parse(djangoShell(code).trim().split("\n").at(-1) ?? "null") as T;
}

const SETTINGS_FIELDS = [
  "terms_uz",
  "terms_ru",
  "terms_en",
  "privacy_policy_uz",
  "privacy_policy_ru",
  "privacy_policy_en",
  "terms_draft_uz",
  "terms_draft_ru",
  "terms_draft_en",
  "privacy_policy_draft_uz",
  "privacy_policy_draft_ru",
  "privacy_policy_draft_en",
  "terms_version",
  "terms_updated_at",
];

/**
 * The legal texts and the published version (`SiteSettings`), as an opaque
 * JSON string for `restoreLegalTexts`: the settings spec publishes a new
 * version, which asks every customer to accept it, so it puts the seed's
 * version back afterwards.
 */
export function snapshotLegalTexts(): string {
  const code = [
    "import json",
    "from glowderma.site_config.models import SiteSettings",
    "s = SiteSettings.load()",
    `fields = json.loads(${JSON.stringify(JSON.stringify(SETTINGS_FIELDS))})`,
    "print(json.dumps({f: (getattr(s, f).isoformat() if f == 'terms_updated_at' and getattr(s, f) else getattr(s, f)) for f in fields}))",
  ].join("\n");
  return JSON.stringify(shellJson<Record<string, string | null>>(code));
}

/** Writes a `snapshotLegalTexts` back and starts a new public-settings cache generation. */
export function restoreLegalTexts(snapshot: string): void {
  const code = [
    "import json",
    "from django.utils.dateparse import parse_datetime",
    "from glowderma.site_config.models import SiteSettings",
    "from glowderma.site_config.selectors import invalidate_public_settings",
    `data = json.loads(${JSON.stringify(snapshot)})`,
    "if data.get('terms_updated_at'): data['terms_updated_at'] = parse_datetime(data['terms_updated_at'])",
    "changed = SiteSettings.objects.filter(pk=1).update(**data)",
    "invalidate_public_settings()",
    "print(json.dumps({'changed': changed}))",
  ].join("\n");
  const answer = shellJson<{ changed: number }>(code);
  if (answer.changed !== 1)
    throw new Error(`the backend did not restore the settings: ${JSON.stringify(answer)}`);
}

/**
 * Removes the specialists and services a spec created (names starting with
 * `prefix`, never a seeded one): the admin API never deletes them (§2.17),
 * and the spec books no appointment, so nothing protects them.
 */
export function deleteClinicRows(prefix: string): { specialists: number; services: number } {
  const code = [
    "import json",
    "from glowderma.professionals.models import Professional, Service",
    `prefix = json.loads(${JSON.stringify(JSON.stringify(prefix))})`,
    "p = Professional.objects.filter(name__startswith=prefix).delete()[0]",
    "s = Service.objects.filter(name_uz__startswith=prefix).delete()[0]",
    "print(json.dumps({'specialists': p, 'services': s}))",
  ].join("\n");
  return shellJson(code);
}

/** Removes the staff accounts a spec invited (emails starting with `prefix`; never the seeded admin). */
export function deleteStaffAccounts(prefix: string): number {
  if (!prefix.startsWith("e2e")) throw new Error("only e2e accounts are deleted");
  const code = [
    "import json",
    "from glowderma.accounts.models import StaffUser",
    `prefix = json.loads(${JSON.stringify(JSON.stringify(prefix))})`,
    "print(json.dumps(StaffUser.objects.filter(email__startswith=prefix).delete()[0]))",
  ].join("\n");
  return shellJson<number>(code);
}

/** Removes the categories (slug prefix) and banners (Uzbek title prefix) a spec left behind. */
export function deleteCatalogRows(slugPrefix: string, titlePrefix: string): void {
  const code = [
    "import json",
    "from glowderma.catalog.models import Banner, Category",
    `slug = json.loads(${JSON.stringify(JSON.stringify(slugPrefix))})`,
    `title = json.loads(${JSON.stringify(JSON.stringify(titlePrefix))})`,
    "c = Category.objects.filter(slug__startswith=slug, products__isnull=True).delete()[0]",
    "b = Banner.objects.filter(title_uz__startswith=title).delete()[0]",
    "print(json.dumps({'categories': c, 'banners': b}))",
  ].join("\n");
  shellJson(code);
}

/**
 * Adds `count` cancelled campaigns titled `<prefix> <n>` (scheduled for 31
 * December 9999, never sent), so the history has more than one page; the
 * seed has four. `deleteCampaigns` removes them again.
 */
export function createCancelledCampaigns(prefix: string, count: number): number {
  const code = [
    "import json",
    "from datetime import datetime",
    "from zoneinfo import ZoneInfo",
    "from django.utils import timezone",
    "from glowderma.notifications.models import Campaign",
    `prefix = json.loads(${JSON.stringify(JSON.stringify(prefix))})`,
    "far = datetime(9999, 12, 31, 10, tzinfo=ZoneInfo('Asia/Tashkent'))",
    `rows = [Campaign(kind='general', title=f'{prefix} {n:02d}', body='E2E tarix: yuborilmaydi.', audience_type='all', link_kind='none', state='cancelled', scheduled_at=far, cancelled_at=timezone.now(), recipient_count=0) for n in range(1, ${Number(count)} + 1)]`,
    "print(json.dumps(len(Campaign.objects.bulk_create(rows))))",
  ].join("\n");
  return shellJson<number>(code);
}

export function deleteCampaigns(prefix: string): number {
  const code = [
    "import json",
    "from glowderma.notifications.models import Campaign",
    `prefix = json.loads(${JSON.stringify(JSON.stringify(prefix))})`,
    "print(json.dumps(Campaign.objects.filter(title__startswith=prefix).delete()[0]))",
  ].join("\n");
  return shellJson<number>(code);
}

const SEO_FIELDS = ["uz", "ru", "en"].flatMap((l) => [`seo_title_${l}`, `seo_description_${l}`]);

/**
 * Puts a product's website fields back after a stopped SEO spec: its slug,
 * its English description and empty SEO texts (the seed has none). Written
 * with `update()`, so no audit row and no `last_change`.
 */
export function restoreProductSeo(id: number, slug: string, enDescription: string): void {
  const code = [
    "import json",
    "from glowderma.catalog.models import Product",
    `slug = json.loads(${JSON.stringify(JSON.stringify(slug))})`,
    `desc = json.loads(${JSON.stringify(JSON.stringify(enDescription))})`,
    `fields = {f: '' for f in ${JSON.stringify(SEO_FIELDS)}}`,
    `print(json.dumps(Product.objects.filter(pk=${Number(id)}).update(slug=slug, description_en=desc, **fields)))`,
  ].join("\n");
  shellJson(code);
}

/** Empties a category's SEO texts again (the seed has none). */
export function clearCategorySeo(slug: string): void {
  const code = [
    "import json",
    "from glowderma.catalog.models import Category",
    `slug = json.loads(${JSON.stringify(JSON.stringify(slug))})`,
    `fields = {f: '' for f in ${JSON.stringify(SEO_FIELDS)}}`,
    "print(json.dumps(Category.objects.filter(slug=slug).update(**fields)))",
  ].join("\n");
  shellJson(code);
}
