import { expect, test, type Page } from "@playwright/test";

import { BACKEND_DIR, deleteClinicRows } from "./backend-shell";
import { API_URL } from "./env";
import { heading, toast, watchPage } from "./helpers";

/**
 * Specialists and services (gap FND-1 / FND-7, contract §2.17): a service
 * and a specialist created in the admin, offered with a price, given weekly
 * hours and switched on are bookable at once through the customer API's
 * free slots; a blocked period and a day off take slots away. The admin API
 * never deletes specialists or services, so the rows (named `e2e …`) are
 * removed through the backend shell afterwards; the spec books nothing.
 */

const PREFIX = "e2e klinika";

test.afterEach(() => {
  if (BACKEND_DIR) deleteClinicRows(PREFIX);
});

/** `YYYY-MM-DD` of the Tashkent day `days` from today. */
function tashkentDay(days: number): string {
  const shifted = new Date(Date.now() + 5 * 3_600_000 + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

async function slots(page: Page, specialistId: string, serviceId: string, date: string) {
  const response = await page.request.get(
    `${API_URL}/api/v1/specialists/${specialistId}/slots/?date=${date}&service_id=${serviceId}`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as {
    price: number;
    duration_min: number;
    working_hours: { start: string; end: string } | null;
    slots: Array<{ start: string }>;
  };
}

test("a specialist with a service and hours made in the admin is bookable", async ({ page }) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the created rows could not be removed");
  test.skip(!API_URL, "E2E_API_URL is not set: the customer API's free slots cannot be read");
  const watcher = watchPage(page);
  const stamp = Date.now();
  const serviceName = `${PREFIX} xizmat ${stamp}`;
  const specialistName = `${PREFIX} mutaxassis ${stamp}`;

  // 1. A service.
  await page.goto("/admin/services");
  await expect(heading(page)).toHaveText("Xizmatlar");
  await page.getByRole("button", { name: "Yangi xizmat" }).click();
  const serviceDialog = page.getByRole("dialog", { name: "Yangi xizmat" });
  await serviceDialog.getByLabel("Nomi (uz)", { exact: true }).fill(serviceName);
  await serviceDialog.getByLabel("Davomiyligi").fill("45");
  await serviceDialog.getByLabel("Davomiyligi").fill("43");
  await serviceDialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(serviceDialog.getByText("Davomiylik 5 daqiqaga karrali bo‘lsin.")).toBeVisible();
  await serviceDialog.getByLabel("Davomiyligi").fill("45");
  await serviceDialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Xizmat qo‘shildi")).toBeVisible();

  // 2. A specialist (created inactive), opened on its page.
  await page.goto("/admin/specialists");
  await page.getByRole("button", { name: "Yangi mutaxassis" }).click();
  const create = page.getByRole("dialog", { name: "Yangi mutaxassis" });
  await create.getByLabel("Ism familiya").fill(specialistName);
  await create.getByLabel("Mutaxassislik").selectOption("cosmetologist");
  await create.getByLabel("Tajriba (yil)").fill("6");
  await create.getByRole("button", { name: "Qo‘shish" }).click();
  await expect(page).toHaveURL(/\/admin\/specialists\/\d+$/);
  await expect(heading(page)).toHaveText(specialistName);
  const specialistId = page.url().split("/").at(-1)!;

  // 3. The offer: the new service at 55 000 so‘m.
  const offers = page.getByRole("region", { name: "Xizmatlar va narxlar" });
  await offers.getByRole("button", { name: "Xizmat qo‘shish" }).click();
  const row = offers.locator("fieldset").last();
  const option = row.getByLabel("Xizmat").locator("option", { hasText: serviceName });
  await row.getByLabel("Xizmat").selectOption((await option.getAttribute("value"))!);
  await row.getByLabel("Narx").fill("55000");
  await offers.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Xizmatlar saqlandi")).toBeVisible();
  const serviceId = await row.locator("select").inputValue();

  // 4. Every day 09:00–18:00, a 13:00–14:00 break.
  const hours = page.getByRole("region", { name: "Haftalik ish vaqti" });
  for (const day of [
    "Dushanba",
    "Seshanba",
    "Chorshanba",
    "Payshanba",
    "Juma",
    "Shanba",
    "Yakshanba",
  ]) {
    const toggle = hours.getByRole("switch", { name: `${day} — ish kuni`, exact: true });
    if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
    await hours.getByLabel(`${day}: tanaffus boshi`, { exact: true }).fill("13:00");
    await hours.getByLabel(`${day}: tanaffus oxiri`, { exact: true }).fill("14:00");
  }
  await hours.getByLabel("Dushanba: tugashi").fill("18:03");
  await hours.getByRole("button", { name: "Saqlash" }).click();
  await expect(hours.getByText("Vaqt 5 daqiqalik qadamda bo‘lsin.")).toBeVisible();
  await hours.getByLabel("Dushanba: tugashi").fill("18:00");
  await hours.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Ish vaqti saqlandi")).toBeVisible();

  // Still inactive: the customer API does not know it yet.
  const tomorrow = tashkentDay(1);
  const hidden = await page.request.get(
    `${API_URL}/api/v1/specialists/${specialistId}/slots/?date=${tomorrow}&service_id=${serviceId}`,
  );
  expect(hidden.status()).toBe(404);

  // 5. Switched on.
  const profile = page.getByRole("region", { name: "Profil" });
  await profile.getByRole("switch", { name: "Mutaxassis faol" }).click();
  await profile.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Profil saqlandi")).toBeVisible();

  const open = await slots(page, specialistId, serviceId, tomorrow);
  expect(open).toMatchObject({
    price: 55_000,
    duration_min: 45,
    working_hours: { start: "09:00", end: "18:00" },
  });
  const starts = open.slots.map((s) => s.start);
  expect(starts).toContain("09:00");
  expect(starts).toContain("10:00");
  // 12:30 + 45 min would run into the break.
  expect(starts).not.toContain("12:30");

  // 6. A blocked period 10:00–11:00 tomorrow takes those slots away; deleting it gives them back.
  const blocks = page.getByRole("region", { name: "Band vaqtlar" });
  await blocks.getByLabel("Boshlanish sanasi").fill(tomorrow);
  await blocks.getByLabel("Boshlanish vaqti").fill("10:00");
  await blocks.getByLabel("Tugash sanasi").fill(tomorrow);
  await blocks.getByLabel("Tugash vaqti").fill("11:00");
  await blocks.getByLabel("Izoh (ixtiyoriy)").fill("E2E yig‘ilish");
  await blocks.getByRole("button", { name: "Band vaqtni qo‘shish" }).click();
  await expect(toast(page, "Band vaqt qo‘shildi")).toBeVisible();
  expect(
    (await slots(page, specialistId, serviceId, tomorrow)).slots.map((s) => s.start),
  ).not.toContain("10:00");
  await blocks
    .getByRole("button", { name: /— o‘chirish$/ })
    .first()
    .click();
  const removeBlock = page.getByRole("alertdialog", { name: "Band vaqtni o‘chirasizmi?" });
  await removeBlock.getByRole("button", { name: "O‘chirish" }).click();
  await expect(removeBlock).toBeHidden();
  expect(
    (await slots(page, specialistId, serviceId, tomorrow)).slots.map((s) => s.start),
  ).toContain("10:00");

  // 7. A day off the day after tomorrow: no hours, no slots.
  const later = tashkentDay(2);
  const overrides = page.getByRole("region", { name: "Alohida kunlar" });
  await overrides.getByLabel("Sana").fill(later);
  await overrides.getByLabel("Izoh (ixtiyoriy)").fill("E2E dam olish");
  await overrides.getByRole("button", { name: "Kunni qo‘shish" }).click();
  await expect(toast(page, "Alohida kun qo‘shildi")).toBeVisible();
  expect(await slots(page, specialistId, serviceId, later)).toMatchObject({
    working_hours: null,
    slots: [],
  });
  // The same date again is the server's `unique`.
  await overrides.getByRole("button", { name: "Kunni qo‘shish" }).click();
  await expect(overrides.getByText("Bu sana uchun alohida jadval allaqachon bor.")).toBeVisible();

  // 8. The list finds it by a folded search and exports it.
  await page.goto(`/admin/specialists?q=${encodeURIComponent(specialistName.toUpperCase())}`);
  await expect(page.getByRole("link", { name: specialistName })).toBeVisible();
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  watcher.assertClean();
});

test("the services list filters by category and status from the URL", async ({ page }) => {
  await page.goto("/admin/services?category=cosmetology&status=active&sort=name");
  await expect(heading(page)).toHaveText("Xizmatlar");
  await expect(page.getByRole("button", { name: "Kategoriya: Kosmetologiya" })).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.locator("td:nth-child(2)").allInnerTexts()) {
    expect(text.trim()).toBe("Kosmetologiya");
  }
});
