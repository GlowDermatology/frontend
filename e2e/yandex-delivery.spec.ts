import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import {
  BACKEND_DIR,
  createPaidYandexOrder,
  openYandexWarehouse,
  restoreYandexWarehouse,
  YANDEX_E2E_ESTIMATE,
  type YandexWarehouseSnapshot,
} from "./backend-shell";
import { adminCredentials, API_URL } from "./env";
import { heading, toast, watchPage } from "./helpers";
import { expectDisabledReason, fillDateTime } from "./ui";

/**
 * Yandex Delivery in the admin panel (plan §3.6–§3.9, §4) against a local
 * backend in fake mode (`YANDEX_DELIVERY_MODE=fake`, `DEV_FEATURES_ALLOWED`,
 * eager Celery: the outbox calls the fake Yandex inside the dispatch request,
 * in the runserver process that also serves the dev route). Each test
 * arranges its own paid Yandex order through the backend shell
 * (`createPaidYandexOrder`: no API places one for a test), dispatches it from
 * the order page like staff do, and moves the fake courier with the
 * staff-only dev route `POST /api/v1/admin/dev/yandex/{order_id}/advance/`
 * (body `{status}`), which applies the claim exactly as the 60 s poll would.
 * The warehouse is opened for the run and restored afterwards.
 */

test.describe.configure({ mode: "serial" });

let warehouse: YandexWarehouseSnapshot | null = null;
let token: string | null = null;

test.beforeAll(() => {
  if (BACKEND_DIR && API_URL) warehouse = openYandexWarehouse();
});

test.afterAll(() => {
  if (warehouse) restoreYandexWarehouse(warehouse);
});

test.beforeEach(() => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: no way to arrange a paid Yandex order");
  test.skip(
    !API_URL,
    "E2E_API_URL is not set: the fake courier moves through the backend's dev route",
  );
});

/** A staff bearer token for the dev route (the panel's own session cookies are HttpOnly). */
async function staffToken(request: APIRequestContext): Promise<string> {
  if (token) return token;
  const { email, password } = adminCredentials();
  const response = await request.post(`${API_URL}/api/v1/admin/auth/login/`, {
    data: { email, password },
  });
  expect(response.status(), await response.text()).toBe(200);
  token = ((await response.json()) as { access: string }).access;
  return token;
}

/** Moves the order's current claim to a Yandex status (the fake, then the single writer). */
async function advance(request: APIRequestContext, orderId: number, status: string) {
  const response = await request.post(`${API_URL}/api/v1/admin/dev/yandex/${orderId}/advance/`, {
    headers: { Authorization: `Bearer ${await staffToken(request)}` },
    data: { status },
  });
  // 404: the backend runs without DEV_FEATURES_ALLOWED or not in fake mode.
  expect(response.status(), await response.text()).toBe(200);
}

const deliveryCard = (page: Page) => page.locator('[aria-labelledby="order-delivery-title"]');

async function openOrder(page: Page, id: number) {
  await page.goto(`/admin/orders/${id}`);
  await expect(heading(page)).toHaveText(`Buyurtma №${id}`);
}

/**
 * "Kuryer chaqirish" as staff do it: the dialog refuses until the contents
 * are confirmed and the parcel weighed; the API answers 202 at
 * `courier_requested` and the page starts its 10 s poll.
 */
async function dispatchThroughUi(page: Page, id: number, button = "Kuryer chaqirish") {
  await openOrder(page, id);
  await expect(deliveryCard(page)).toContainText("Kuryer chaqirilishini kutmoqda");
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Buyurtma №${id}: kuryer chaqirish` });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Kuryer chaqirish" }).click();
  // Both fields are missing: the summary lists them and the first one is revealed.
  await expect(
    dialog.getByText("Jo‘natma tarkibini tekshirganingizni tasdiqlang.", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole("alert").filter({ hasText: "Og‘irlik" })).toBeVisible();
  await dialog.getByLabel(/Jo‘natma tarkibini tekshirdim/).check();
  await dialog.getByLabel(/Jo‘natma og‘irligi/).fill("650");
  await dialog.getByRole("button", { name: "Kuryer chaqirish" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Kuryer chaqirildi")).toBeVisible();
}

test("staff dispatch a paid Yandex order and the fake courier delivers it", async ({
  page,
  request,
}) => {
  const watcher = watchPage(page);
  const id = createPaidYandexOrder({ fake: { offer_price: YANDEX_E2E_ESTIMATE } });

  await dispatchThroughUi(page, id);
  // 202: the claim is stored and Yandex searches; the page re-reads every 10 s.
  await expect(page.locator("#dispatch-progress")).toBeVisible();
  await expect(deliveryCard(page)).toContainText("Kuryer qidirilmoqda");
  await expect(deliveryCard(page)).toContainText("650 g");

  await advance(request, id, "performer_found");
  // The poll sees the courier within one interval and stops.
  await expect(toast(page, "Kuryer topildi")).toBeVisible({ timeout: 25_000 });
  await expect(deliveryCard(page)).toContainText("Kuryer biriktirildi");
  await expect(deliveryCard(page).getByRole("link", { name: /Xaritada ochish/ })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator("#dispatch-progress")).toHaveCount(0);
  // Never a courier or customer phone in the carrier view.
  await expect(deliveryCard(page)).not.toContainText(/\+998|tel:/);
  // A dispatched Yandex order offers no BTS hand-off; its status menu explains why it is empty.
  await expect(page.getByRole("button", { name: /BTS ga/ })).toHaveCount(0);

  await advance(request, id, "pickuped");
  await openOrder(page, id);
  await expect(page.locator("h1:visible").locator("..")).toContainText("Kuryerga topshirildi");
  await expect(deliveryCard(page)).toContainText("Yo‘lda");
  // A Yandex order moves only by Yandex's statuses: no manual target, no BTS button.
  await expect(page.getByRole("button", { name: /BTS ga/ })).toHaveCount(0);

  await advance(request, id, "delivered");
  await openOrder(page, id);
  await expect(page.locator("h1:visible").locator("..")).toContainText("Yetkazildi");
  await expect(deliveryCard(page)).toContainText("Topshirildi");
  const history = page.locator('[aria-labelledby="order-history-title"]');
  await expect(history.getByRole("listitem").first()).toContainText("Yetkazildi");
  await expect(history.getByRole("listitem").first()).toContainText("YANDEX");
  await expect(page.getByRole("button", { name: "Bekor qilish" })).toHaveCount(0);
  watcher.assertClean();
});

test("a failed delivery opens an issue in «Muammolar» and the return is confirmed", async ({
  page,
  request,
}) => {
  const watcher = watchPage(page);
  const id = createPaidYandexOrder({ fake: { offer_price: YANDEX_E2E_ESTIMATE } });

  await dispatchThroughUi(page, id);
  await advance(request, id, "performer_found");
  await advance(request, id, "pickuped");
  // The recipient could not be reached: Yandex brings the parcel back (plan §3.7).
  await advance(request, id, "returning");

  await openOrder(page, id);
  await expect(deliveryCard(page)).toContainText("Omborga qaytarilmoqda");
  const issues = deliveryCard(page).getByRole("list", { name: "Ochiq muammolar" });
  await expect(issues).toContainText("Yetkazib bo‘lmadi");
  const history = page.locator('[aria-labelledby="order-history-title"]');
  await expect(history).toContainText("Yetkazib bo‘lmadi");

  await page.goto(`/admin/delivery-issues?order=${id}`);
  await expect(heading(page)).toHaveText("Muammolar");
  const row = page.locator("table tbody tr").filter({ hasText: "Yetkazib bo‘lmadi" });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("link", { name: new RegExp(String(id)) })).toHaveAttribute(
    "href",
    `/admin/orders/${id}`,
  );

  await openOrder(page, id);
  await page.getByRole("button", { name: "Qaytganini tasdiqlash" }).click();
  const dialog = page.getByRole("dialog", {
    name: `Buyurtma №${id}: posilka qaytganini tasdiqlash`,
  });
  await dialog.getByLabel("Izoh (ixtiyoriy)").fill("e2e: qadoq butun");
  await dialog.getByRole("button", { name: "Qaytganini tasdiqlash" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Posilka qaytgani tasdiqlandi")).toBeVisible();
  await expect(deliveryCard(page)).toContainText("Omborga qaytdi");
  await expect(page.getByRole("button", { name: "Qaytganini tasdiqlash" })).toHaveCount(0);

  await page.reload();
  await expect(deliveryCard(page)).toContainText("Omborga qaytdi");
  watcher.assertClean();
});

test("an offer above the policy limit goes to review and staff approve it", async ({
  page,
  request,
}) => {
  const watcher = watchPage(page);
  // The fake's binding offer is 25 000 so‘m above the checkout estimate (limit 10 000).
  const id = createPaidYandexOrder({ fake: { offer_price: 45_000 } });

  await dispatchThroughUi(page, id);
  // The outbox ran inside the request: the first re-read shows the review and ends the poll.
  await expect(toast(page, "Narxni tasdiqlash kerak")).toBeVisible({ timeout: 25_000 });
  await expect(toast(page, "Narxni tasdiqlash kerak")).toHaveAttribute("data-tone", "warning");
  await expect(deliveryCard(page)).toContainText("Narxni tasdiqlash kerak");

  await page.getByRole("button", { name: "Narxni ko‘rib chiqish" }).click();
  const dialog = page.getByRole("dialog", { name: `Buyurtma №${id}: kuryer chaqirish` });
  const review = dialog.getByRole("region", { name: "Narxni tasdiqlash kerak" });
  await expect(review).toContainText(/Yandex taklifi\s*45\s000\sso‘m/);
  await expect(review).toContainText(/Checkout taxmini\s*20\s000\sso‘m/);
  await expect(review).toContainText(/Mijoz to‘lagan\s*22\s000\sso‘m/);
  await expect(review).toContainText("chegaradan");
  // The earlier weight comes back from the server.
  await expect(dialog.getByLabel(/Jo‘natma og‘irligi/)).toHaveValue("650");
  await expect(dialog.getByRole("radiogroup", { name: "Yetkazish usuli" })).toBeVisible();
  await dialog.getByLabel(/Jo‘natma tarkibini tekshirdim/).check();
  await dialog.getByRole("button", { name: /Taklifni tasdiqlash/ }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Kuryer chaqirildi")).toBeVisible();
  await expect(deliveryCard(page)).toContainText(/Tasdiqlangan narx\s*45\s000\sso‘m/);

  await advance(request, id, "performer_found");
  await expect(toast(page, "Kuryer topildi")).toBeVisible({ timeout: 25_000 });
  await expect(deliveryCard(page).getByRole("list", { name: "Ochiq muammolar" })).toHaveCount(0);
  watcher.assertClean();
});

test("the courier switch asks for a future end and explains its controls", async ({ page }) => {
  const watcher = watchPage(page);
  await page.goto("/admin/delivery-issues");
  await expect(heading(page)).toHaveText("Muammolar");
  // No filter set yet: «Filtrlarni tozalash» is unavailable and says why.
  await expectDisabledReason(
    page.getByRole("button", { name: "Filtrlarni tozalash" }),
    "Hozir filtr qo‘yilmagan",
  );
  const toggle = page.getByRole("switch", { name: "Kuryer chaqirishni to‘xtatish" });
  test.skip((await toggle.getAttribute("aria-checked")) === "true", "dispatch is suspended now");
  await toggle.click();
  const dialog = page.getByRole("dialog", { name: "Kuryer chaqirishni to‘xtatasizmi?" });
  // The end is a picker (DD.MM.YYYY HH:MM, typed ISO accepted); a past one is refused here.
  await fillDateTime(dialog, "Qachongacha (ixtiyoriy)", "2020-01-01T10:00");
  await dialog.getByRole("button", { name: "To‘xtatish" }).click();
  await expect(dialog.getByText("Kelajakdagi vaqtni tanlang.")).toBeVisible();
  await dialog.getByRole("button", { name: "Orqaga" }).click();
  await expect(dialog).toBeHidden();
  // Nothing was sent: the switch (hidden from the tree behind the modal) is still off.
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  watcher.assertClean();
});
