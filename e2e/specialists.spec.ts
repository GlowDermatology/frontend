import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { BACKEND_DIR, deleteClinicRows, deleteStaffAccounts } from "./backend-shell";
import { saveAnyway } from "./catalog-helpers";
import { API_URL } from "./env";
import { heading, toast, watchPage } from "./helpers";
import { fillDate, fillTime, selectOption, selectValue } from "./ui";

/**
 * Specialists and services (gap FND-1 / FND-7, contract §2.17): a service
 * created in the admin and a specialist invited on «Xodimlar» (the account and
 * its draft profile together), completed, offered with a price, given weekly
 * hours and published are bookable at once through the customer API's free
 * slots; a blocked period and a day off take slots away. The admin API never
 * deletes specialists or services, so the rows (named `e2e …`) and the invited
 * account are removed through the backend shell afterwards; the spec books
 * nothing.
 */

const PREFIX = "e2e klinika";
const EMAIL_PREFIX = "e2e-mutaxassis-";
const PHOTO = join(__dirname, "..", "public", "mock", "banner-night.png");

test.afterEach(() => {
  if (!BACKEND_DIR) return;
  // The profile first: it belongs to the account.
  deleteClinicRows(PREFIX);
  deleteStaffAccounts(EMAIL_PREFIX);
});

/** `YYYY-MM-DD` of the Tashkent day `days` from today. */
function tashkentDay(days: number): string {
  const shifted = new Date(Date.now() + 5 * 3_600_000 + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

async function slots(
  page: Page,
  specialistId: string,
  serviceId: string,
  locationId: string,
  date: string,
) {
  const response = await page.request.get(
    `${API_URL}/api/v1/specialists/${specialistId}/slots/?date=${date}&service_id=${serviceId}&location_id=${locationId}`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as {
    price: number;
    duration_min: number;
    working_hours: { start: string; end: string } | null;
    slots: Array<{ start: string }>;
  };
}

test("a specialist works at two clinics and only the scheduled clinic offers bookings", async ({
  page,
}) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the created rows could not be removed");
  test.skip(!API_URL, "E2E_API_URL is not set: the customer API's free slots cannot be read");
  const watcher = watchPage(page);
  const stamp = Date.now();
  const serviceName = `${PREFIX} xizmat ${stamp}`;
  const specialistName = `${PREFIX} mutaxassis ${stamp}`;
  const firstClinic = `${PREFIX} Chilonzor ${stamp}`;
  const secondClinic = `${PREFIX} Yunusobod ${stamp}`;
  const firstAddress = "Toshkent, Chilonzor, Bunyodkor ko‘chasi, 11";
  const secondAddress = "Toshkent, Yunusobod, Amir Temur ko‘chasi, 22";
  const tomorrow = tashkentDay(1);
  const weekdays = [
    "Yakshanba",
    "Dushanba",
    "Seshanba",
    "Chorshanba",
    "Payshanba",
    "Juma",
    "Shanba",
  ];
  const tomorrowWeekday = weekdays[new Date(`${tomorrow}T12:00:00+05:00`).getUTCDay()]!;

  await page.goto("/admin/clinics");
  await expect(heading(page)).toHaveText("Klinikalar");
  for (const [name, address] of [
    [firstClinic, firstAddress],
    [secondClinic, secondAddress],
  ] as const) {
    await page.getByRole("button", { name: "Yangi klinika" }).click();
    const clinic = page.getByRole("dialog", { name: "Yangi klinika" });
    await clinic.getByLabel("Nomi (o‘zbekcha)", { exact: true }).fill(name);
    await clinic.getByLabel("Manzil (o‘zbekcha)", { exact: true }).fill(address);
    await clinic.getByRole("button", { name: "Saqlash" }).click();
    await expect(clinic).toBeHidden();
    await expect(page.getByText(address, { exact: true })).toBeVisible();
  }

  await page
    .getByRole("listitem")
    .filter({ hasText: secondClinic })
    .getByRole("button", { name: "Klinikani tahrirlash" })
    .click();
  const editClinic = page.getByRole("dialog", { name: "Klinikani tahrirlash" });
  await editClinic
    .getByLabel("Mo‘ljal va kirish yo‘li (o‘zbekcha)", { exact: true })
    .fill("Kirish hovlidan");
  await editClinic.getByRole("button", { name: "Saqlash" }).click();
  await expect(editClinic).toBeHidden();
  await expect(page.getByText("Kirish hovlidan", { exact: true })).toBeVisible();

  // Create the service shared by both branches.
  await page.goto("/admin/services");
  await expect(heading(page)).toHaveText("Xizmatlar");
  await page.getByRole("button", { name: "Yangi xizmat" }).click();
  const serviceDialog = page.getByRole("dialog", { name: "Yangi xizmat" });
  await serviceDialog.getByLabel("Nomi (o‘zbekcha)", { exact: true }).fill(serviceName);
  await serviceDialog.getByLabel("Davomiyligi").fill("45");
  await serviceDialog.getByLabel("Davomiyligi").fill("43");
  await serviceDialog.getByRole("button", { name: "Saqlash" }).click();
  // The error is listed above the form and shown under the field, which gets the focus.
  await expect(
    serviceDialog.getByText("Davomiylik 5 daqiqaga karrali bo‘lsin.").first(),
  ).toBeVisible();
  await expect(serviceDialog.getByLabel("Davomiyligi")).toBeFocused();
  await serviceDialog.getByLabel("Davomiyligi").fill("45");
  await serviceDialog.getByRole("button", { name: "Saqlash" }).click();
  // No Russian/English name or description yet: "save anyway?".
  await saveAnyway(page, toast(page, "Xizmat qo‘shildi"));
  await expect(toast(page, "Xizmat qo‘shildi")).toBeVisible();

  // 2. A Specialist invited on «Xodimlar»: the account and its draft profile together.
  await page.goto("/admin/staff");
  await page.getByRole("button", { name: "Yangi xodim" }).click();
  const invite = page.getByRole("dialog", { name: "Yangi xodim" });
  await invite.getByLabel("Email", { exact: true }).fill(`${EMAIL_PREFIX}${stamp}@glowderma.uz`);
  await invite.getByLabel("To‘liq ism").fill(specialistName);
  await selectOption(invite, "Rol", "Mutaxassis");
  await invite
    .getByRole("group", { name: "Kirish usuli" })
    .getByText("Vaqtinchalik parol", { exact: true })
    .click();
  await invite.getByRole("button", { name: "Xodim qo‘shish" }).click();
  const invited = page.getByRole("dialog", { name: "Mutaxassis taklif qilindi" });
  await invited.getByRole("link", { name: "Profilni ochish" }).click();
  await expect(page).toHaveURL(/\/admin\/specialists\/\d+$/);
  await expect(heading(page)).toHaveText(specialistName);
  const specialistId = page.url().split("/").at(-1)!;
  const checklist = page.getByRole("region", { name: "E’lon qilish" });
  await expect(checklist).toContainText("Mutaxassislik");

  // The draft is completed: discipline, experience, the first clinics, a bio and a photo.
  const profile = page.getByRole("region", { name: "Profil" });
  await selectOption(profile, "Mutaxassislik", "Kosmetolog");
  expect(await selectValue(profile, "Mutaxassislik")).toBe("cosmetologist");
  await profile.getByLabel("Tajriba (yil)").fill("6");
  for (const clinic of [firstClinic, secondClinic]) {
    const assign = profile.getByRole("switch", { name: new RegExp(clinic) });
    await assign.click();
    await expect(assign).toBeChecked();
  }
  await selectOption(profile, "Asosiy klinika", firstClinic);
  await profile.getByLabel("Qisqacha ma’lumot").fill("E2E: teri parvarishi bo‘yicha mutaxassis.");
  await profile.getByRole("button", { name: "Saqlash" }).click();
  await saveAnyway(page, toast(page, "Profil saqlandi"));
  await expect(toast(page, "Profil saqlandi")).toBeVisible();
  await profile.locator('input[type="file"]').setInputFiles(PHOTO);
  await expect(toast(page, "Rasm saqlandi")).toBeVisible();

  // 3. The offer: the new service at 55 000 so‘m.
  const offers = page.getByRole("region", { name: "Xizmatlar va narxlar" });
  await offers.getByRole("button", { name: "Xizmat qo‘shish" }).click();
  const row = offers.locator("fieldset").last();
  await selectOption(row, "Xizmat", serviceName);
  await row.getByLabel("Narx").fill("55000");
  await offers.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Xizmatlar saqlandi")).toBeVisible();
  const serviceId = await selectValue(row, "Xizmat");
  expect(serviceId).toMatch(/^\d+$/);

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
    await selectOption(
      hours,
      `${day}: Klinika`,
      day === tomorrowWeekday ? secondClinic : firstClinic,
    );
    await fillTime(hours, `${day}: tanaffus boshi`, "13:00");
    await fillTime(hours, `${day}: tanaffus oxiri`, "14:00");
  }
  await fillTime(hours, "Dushanba: tugashi", "18:03");
  await hours.getByRole("button", { name: "Saqlash" }).click();
  await expect(hours.getByText("Vaqt 5 daqiqalik qadamda bo‘lsin.").first()).toBeVisible();
  await expect(hours.getByLabel("Dushanba: tugashi", { exact: true })).toBeFocused();
  await fillTime(hours, "Dushanba: tugashi", "18:00");
  await hours.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Ish vaqti saqlandi")).toBeVisible();

  // Still a draft: the customer API does not know it yet.
  const locationId = await selectValue(hours, `${tomorrowWeekday}: Klinika`);
  const otherWeekday = weekdays.find((day) => day !== tomorrowWeekday)!;
  const otherLocationId = await selectValue(hours, `${otherWeekday}: Klinika`);
  const hidden = await page.request.get(
    `${API_URL}/api/v1/specialists/${specialistId}/slots/?date=${tomorrow}&service_id=${serviceId}&location_id=${locationId}`,
  );
  expect(hidden.status()).toBe(404);

  // 5. Published once the checklist is complete (the page re-reads it).
  await page.reload();
  await expect(page.getByRole("region", { name: "E’lon qilish" })).toContainText("Profil tayyor");
  await profile.getByRole("switch", { name: "Profilni e’lon qilish" }).click();
  await profile.getByRole("button", { name: "Saqlash" }).click();
  // Published without qualifications: "save anyway?".
  await saveAnyway(page, toast(page, "Profil saqlandi"));
  await expect(toast(page, "Profil saqlandi")).toBeVisible();

  const open = await slots(page, specialistId, serviceId, locationId, tomorrow);
  expect(open).toMatchObject({
    price: 55_000,
    duration_min: 45,
    working_hours: { start: "09:00", end: "18:00" },
  });
  expect((await slots(page, specialistId, serviceId, otherLocationId, tomorrow)).slots).toEqual([]);
  const starts = open.slots.map((s) => s.start);
  expect(starts).toContain("09:00");
  expect(starts).toContain("10:00");
  // 12:30 + 45 min would run into the break.
  expect(starts).not.toContain("12:30");

  // 6. A blocked period 10:00–11:00 tomorrow takes those slots away; deleting it gives them back.
  const blocks = page.getByRole("region", { name: "Band vaqtlar" });
  await fillDate(blocks, "Boshlanish sanasi", tomorrow);
  await fillTime(blocks, "Boshlanish vaqti", "10:00");
  await fillDate(blocks, "Tugash sanasi", tomorrow);
  await fillTime(blocks, "Tugash vaqti", "11:00");
  await blocks.getByLabel("Izoh (ixtiyoriy)").fill("E2E yig‘ilish");
  await blocks.getByRole("button", { name: "Band vaqtni qo‘shish" }).click();
  await expect(toast(page, "Band vaqt qo‘shildi")).toBeVisible();
  expect(
    (await slots(page, specialistId, serviceId, locationId, tomorrow)).slots.map((s) => s.start),
  ).not.toContain("10:00");
  await blocks
    .getByRole("button", { name: /— o‘chirish$/ })
    .first()
    .click();
  const removeBlock = page.getByRole("alertdialog", { name: "Band vaqtni o‘chirasizmi?" });
  await removeBlock.getByRole("button", { name: "O‘chirish" }).click();
  await expect(removeBlock).toBeHidden();
  expect(
    (await slots(page, specialistId, serviceId, locationId, tomorrow)).slots.map((s) => s.start),
  ).toContain("10:00");

  // 7. A day off the day after tomorrow: no hours, no slots.
  const later = tashkentDay(2);
  const overrides = page.getByRole("region", { name: "Alohida kunlar" });
  await fillDate(overrides, "Sana", later);
  await overrides.getByLabel("Izoh (ixtiyoriy)").fill("E2E dam olish");
  await overrides.getByRole("button", { name: "Kunni qo‘shish" }).click();
  await expect(toast(page, "Alohida kun qo‘shildi")).toBeVisible();
  expect(await slots(page, specialistId, serviceId, otherLocationId, later)).toMatchObject({
    working_hours: null,
    slots: [],
  });
  // The same date again is the server's `unique`.
  await overrides.getByRole("button", { name: "Kunni qo‘shish" }).click();
  await expect(
    overrides.getByText("Bu sana uchun alohida jadval allaqachon bor.").first(),
  ).toBeVisible();

  // 8. The list finds it by a folded search and exports it.
  await page.goto(`/admin/specialists?q=${encodeURIComponent(specialistName.toUpperCase())}`);
  await expect(page.getByRole("link", { name: specialistName })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: specialistName })).toContainText(
    firstClinic,
  );
  await expect(page.getByRole("row").filter({ hasText: specialistName })).toContainText(
    secondClinic,
  );
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  watcher.assertClean();
});

test("the services list filters by category and status from the URL", async ({ page }) => {
  await page.goto("/admin/services?category=cosmetology&status=active&sort=name");
  await expect(heading(page)).toHaveText("Xizmatlar");
  expect(await selectValue(page, "Kategoriya")).toBe("cosmetology");
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.locator("td:nth-child(2)").allInnerTexts()) {
    expect(text.trim()).toBe("Kosmetologiya");
  }
});
