import { join } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { appointmentsCopy } from "../src/features/admin/appointments/copy";
import { shellCopy } from "../src/features/admin/shell/copy";
import { specialistsCopy } from "../src/features/admin/specialists/copy";
import { servicesCardCopy } from "../src/features/admin/specialists/services-copy";
import { BACKEND_DIR, customerPhones, SPECIALIST_CLINIC } from "./backend-shell";
import { saveAnyway } from "./catalog-helpers";
import { SPECIALIST_STORAGE_STATE, specialistCredentials } from "./env";
import { heading, signIn, toast, watchPage } from "./helpers";
import { fillDate, fillTime, selectOption, selectTrigger, selectValue } from "./ui";

/**
 * The specialist workspace (`/admin/my-*`), driven as the e2e Specialist account
 * (`E2E_SPECIALIST_PASSWORD`, signed in by the global setup to `e2e/.auth/specialist.json`):
 *
 * - signing in lands on «Qabullar» (`/admin/my-appointments`); the sidebar lists only the
 *   specialist's sections (no admin section, global search or delivery alert) and an admin
 *   address sends the specialist back to their own appointments;
 * - «Profil»: discipline, experience, bio and photo, then publishing once the checklist is
 *   complete; «Xizmatlar»: create, edit and delete their own services; «Ish jadvali»: weekly
 *   hours and a blocked period through the kit's time and date pickers;
 * - «Qabullar»: a visit booked for a known customer's phone and one for a new phone (the dialog
 *   then asks for the walk-in's name and creates the customer), moved and cancelled from the
 *   visit panel; the booked service cannot be deleted any more, only deactivated.
 *
 * The global setup resets the account through the backend shell (`ensureSpecialistAccount`: a
 * draft profile at `SPECIALIST_CLINIC`, no hours, no unbooked services), so the spec needs
 * `E2E_BACKEND_DIR`. What it books stays (appointments are never deleted): the visits end
 * cancelled, the walk-in customer and the booked service (deactivated) remain.
 */

const s = specialistsCopy.uz;
const sv = servicesCardCopy.uz;
const a = appointmentsCopy.uz;
const sh = shellCopy.uz;

const PHOTO = join(__dirname, "..", "public", "mock", "banner-night.png");
const WEEKDAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
const STAMP = Date.now();
const SERVICE = `e2e ishxona xizmati ${STAMP}`;
const SPARE_SERVICE = `e2e ishxona qo‘shimcha ${STAMP}`;
const WALK_IN = `E2E yangi mijoz ${STAMP}`;

/** `YYYY-MM-DD` of the Tashkent day `days` from today. */
function tashkentDay(days: number): string {
  const shifted = new Date(Date.now() + 5 * 3_600_000 + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

const BOOKING_DAY = tashkentDay(1);
const BOARD = `/admin/my-appointments?date=${BOOKING_DAY}`;

/** The ids of the visits the board shows. */
async function visitIds(page: Page): Promise<string[]> {
  return page
    .locator("button[data-appointment-id]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-appointment-id") ?? ""));
}

/** Opens the time `Select` of the booking dialog and picks its first (or last) free slot. */
async function pickTime(dialog: Locator, which: "first" | "last"): Promise<void> {
  await selectTrigger(dialog, a.booking.time).click();
  const list = dialog.page().getByRole("listbox");
  await expect(list).toBeVisible();
  const free = list.locator('[role="option"]:not([aria-disabled="true"])');
  await expect(free.first()).toBeVisible();
  await (which === "first" ? free.first() : free.last()).click();
  await expect(list).toBeHidden();
}

/** «Yangi qabul» for `phone` with the spec's service on the board's day. */
async function openBooking(page: Page, phone: string): Promise<Locator> {
  await page.getByRole("button", { name: a.header.add }).click();
  const dialog = page.getByRole("dialog", { name: a.booking.titleCreate });
  await expect(dialog).toBeVisible();
  // A specialist books only themselves: no specialist to choose.
  await expect(selectTrigger(dialog, a.booking.specialist)).toHaveCount(0);
  await selectOption(dialog, a.booking.service, SERVICE);
  await dialog.getByLabel(a.booking.phone, { exact: true }).fill(phone);
  await pickTime(dialog, "first");
  return dialog;
}

test.describe("the specialist workspace", () => {
  test.skip(!specialistCredentials(), "E2E_SPECIALIST_PASSWORD is not set: no Specialist account");
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the Specialist account cannot be reset");
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: SPECIALIST_STORAGE_STATE });

  test("signing in lands on the own appointments with the specialist's sections only", async ({
    browser,
    page,
  }) => {
    const { email, password } = specialistCredentials()!;
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const fresh = await context.newPage();
    await signIn(fresh, password, email);
    await expect(fresh).toHaveURL(/\/admin\/my-appointments$/);
    await expect(heading(fresh)).toHaveText(a.title);
    await context.close();

    const watcher = watchPage(page);
    await page.goto("/admin/my-appointments");
    const nav = page.getByRole("navigation", { name: sh.specialistSections }).first();
    for (const label of Object.values(sh.specialistNav)) {
      await expect(nav.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    for (const label of [sh.nav.customers, sh.nav.orders, sh.nav.specialists, sh.nav.staff]) {
      await expect(nav.getByRole("link", { name: label })).toHaveCount(0);
    }
    await expect(page.getByRole("navigation", { name: sh.sections })).toHaveCount(0);
    await expect(page.getByRole("search")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Yetkazish muammolari/ })).toHaveCount(0);
    await expect(page.locator('a[href="/admin/notifications"]')).toHaveCount(0);

    // An admin address (or the admin dashboard) sends the specialist back home.
    for (const href of ["/admin", "/admin/customers", "/admin/appointments"]) {
      await page.goto(href);
      await expect(page).toHaveURL(/\/admin\/my-appointments$/);
    }
    watcher.assertClean();
  });

  test("the specialist completes the profile, services and hours, then publishes", async ({
    page,
  }) => {
    const watcher = watchPage(page);

    // «Profil»: the draft is completed (the clinic is the administrator's, shown read-only).
    await page.goto("/admin/my-profile");
    await expect(heading(page)).toHaveText(sh.specialistNav["my-profile"]);
    const checklist = page.getByRole("region", { name: s.publish.title });
    await expect(checklist).toContainText(s.publish.blockers.discipline);
    await expect(checklist).toContainText(s.publish.blockers.service);
    const profile = page.getByRole("region", { name: s.profile.title, exact: true });
    await expect(profile).toContainText(SPECIALIST_CLINIC);
    await selectOption(profile, s.profile.role, "Kosmetolog");
    expect(await selectValue(profile, s.profile.role)).toBe("cosmetologist");
    await profile.getByLabel(s.profile.experience).fill("4");
    await profile.getByLabel(s.profile.bio).first().fill("E2E: o‘z ish joyini boshqaradi.");
    await profile.getByRole("button", { name: "Saqlash" }).click();
    await saveAnyway(page, toast(page, s.profile.saved));
    await expect(toast(page, s.profile.saved)).toBeVisible();
    await profile.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(toast(page, s.photo.saved)).toBeVisible();

    // «Xizmatlar»: two own services; the spare one is edited, then deleted (never booked).
    await page.goto("/admin/my-services");
    await expect(heading(page)).toHaveText(sh.specialistNav["my-services"]);
    const services = page.getByRole("region", { name: sv.title });
    for (const [name, price] of [
      [SERVICE, "80000"],
      [SPARE_SERVICE, "30000"],
    ] as const) {
      await services.getByRole("button", { name: sv.add }).click();
      const dialog = page.getByRole("dialog", { name: sv.dialog.createTitle });
      await dialog.getByLabel("Nomi (o‘zbekcha)", { exact: true }).fill(name);
      await dialog.getByLabel(sv.dialog.price, { exact: true }).fill(price);
      await dialog.getByLabel(sv.dialog.duration, { exact: true }).fill("45");
      await dialog.getByRole("button", { name: sv.dialog.save }).click();
      await saveAnyway(page, toast(page, sv.created));
      await expect(dialog).toBeHidden();
      await expect(services.getByRole("listitem").filter({ hasText: name })).toBeVisible();
    }
    await services.getByRole("button", { name: sv.edit(SPARE_SERVICE) }).click();
    const edit = page.getByRole("dialog", { name: sv.dialog.editTitle });
    await edit.getByLabel(sv.dialog.price, { exact: true }).fill("35000");
    await edit.getByRole("button", { name: sv.dialog.save }).click();
    await saveAnyway(page, toast(page, sv.saved));
    await expect(edit).toBeHidden();
    await expect(services.getByRole("listitem").filter({ hasText: SPARE_SERVICE })).toContainText(
      "35",
    );
    await services.getByRole("button", { name: sv.remove(SPARE_SERVICE) }).click();
    const remove = page.getByRole("alertdialog", { name: sv.removeTitle });
    await remove.getByRole("button", { name: s.remove.confirm }).click();
    await expect(toast(page, sv.removed)).toBeVisible();
    await expect(services.getByRole("listitem").filter({ hasText: SPARE_SERVICE })).toHaveCount(0);

    // «Ish jadvali»: every day 09:00–18:00 at the clinic, with a break, through the time pickers.
    await page.goto("/admin/my-schedule");
    await expect(heading(page)).toHaveText(sh.specialistNav["my-schedule"]);
    const hours = page.getByRole("region", { name: s.hours.title });
    for (const day of WEEKDAYS) {
      const toggle = hours.getByRole("switch", { name: s.hours.workdaySwitch(day), exact: true });
      if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
      await selectOption(hours, `${day}: Klinika`, SPECIALIST_CLINIC);
      await fillTime(hours, `${day}: boshlanishi`, "09:00");
      await fillTime(hours, `${day}: tugashi`, "18:00");
      await fillTime(hours, `${day}: tanaffus boshi`, "13:00");
      await fillTime(hours, `${day}: tanaffus oxiri`, "14:00");
    }
    await hours.getByRole("button", { name: "Saqlash" }).click();
    await expect(toast(page, s.hours.saved)).toBeVisible();

    // A blocked period through the date and time pickers, then removed again.
    const blocks = page.getByRole("region", { name: s.blocks.title });
    const later = tashkentDay(3);
    await fillDate(blocks, s.blocks.startDate, later);
    await fillTime(blocks, s.blocks.startTime, "10:00");
    await fillDate(blocks, s.blocks.endDate, later);
    await fillTime(blocks, s.blocks.endTime, "11:00");
    await blocks.getByLabel(s.blocks.note).fill("E2E yig‘ilish");
    await blocks.getByRole("button", { name: s.blocks.submit }).click();
    await expect(toast(page, s.blocks.added)).toBeVisible();
    await blocks
      .getByRole("button", { name: /— o‘chirish$/ })
      .first()
      .click();
    const removeBlock = page.getByRole("alertdialog", { name: s.blocks.removeTitle });
    await removeBlock.getByRole("button", { name: s.remove.confirm }).click();
    await expect(removeBlock).toBeHidden();
    await expect(toast(page, s.blocks.removed)).toBeVisible();

    // Published once the checklist is complete (the page re-reads it).
    await page.goto("/admin/my-profile");
    await expect(page.getByRole("region", { name: s.publish.title })).toContainText(
      s.publish.ready,
    );
    const publish = page.getByRole("region", { name: s.profile.title, exact: true });
    await publish.getByRole("switch", { name: s.profile.activeSwitch }).click();
    await publish.getByRole("button", { name: "Saqlash" }).click();
    await saveAnyway(page, toast(page, s.profile.saved));
    await expect(toast(page, s.profile.saved)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: s.publish.title })).toContainText(
      s.publish.published,
    );
    watcher.assertClean();
  });

  test("the specialist books a known customer and a walk-in, moves and cancels them", async ({
    page,
  }) => {
    const watcher = watchPage(page);
    const phones = customerPhones();
    await page.goto(BOARD);
    await expect(heading(page)).toHaveText(a.title);
    // The board offers the day, week and month views.
    for (const view of Object.values(a.header.views)) {
      await expect(page.getByRole("radio", { name: view })).toBeVisible();
    }

    // A known customer's phone books at once (confirmed, no name asked).
    const before = new Set(await visitIds(page));
    const known = await openBooking(page, phones.known);
    await expect(known.getByLabel(a.booking.name, { exact: true })).toHaveCount(0);
    await known.getByRole("button", { name: a.booking.submitCreate }).click();
    await expect(toast(page, a.toast.booked)).toBeVisible();
    await expect(known).toBeHidden();
    await expect.poll(async () => (await visitIds(page)).length).toBe(before.size + 1);
    const knownId = (await visitIds(page)).find((id) => !before.has(id))!;

    // A new phone: the server asks for the walk-in's name, then creates the customer too.
    const walkIn = await openBooking(page, phones.fresh);
    await walkIn.getByRole("button", { name: a.booking.submitCreate }).click();
    const name = walkIn.getByLabel(a.booking.name, { exact: true });
    await expect(name).toBeVisible();
    await name.fill(WALK_IN);
    await walkIn.getByRole("button", { name: a.booking.submitCreate }).click();
    await expect(toast(page, a.toast.booked)).toBeVisible();
    await expect(walkIn).toBeHidden();
    const walkInVisit = page.locator("button[data-appointment-id]").filter({ hasText: WALK_IN });
    await expect(walkInVisit).toBeVisible();

    // The known customer's visit is moved to the day's last free slot.
    const panel = page.locator('[aria-labelledby="appointment-title"]');
    await page.locator(`button[data-appointment-id="${knownId}"]`).click();
    await expect(panel).toContainText(a.status.confirmed);
    await panel.getByRole("button", { name: a.panel.move }).click();
    const move = page.getByRole("dialog", { name: a.booking.titleMove });
    await pickTime(move, "last");
    await move.getByRole("button", { name: a.booking.submitMove }).click();
    await expect(toast(page, a.toast.moved)).toBeVisible();
    await expect(move).toBeHidden();

    // Both visits are cancelled from the panel (the reason is for administrators only).
    for (const visit of [page.locator(`button[data-appointment-id="${knownId}"]`), walkInVisit]) {
      await visit.click();
      await expect(visit).toHaveAttribute("aria-pressed", "true");
      await panel.getByRole("button", { name: a.panel.cancel }).click();
      const cancel = page.getByRole("alertdialog", { name: a.panel.cancelTitle });
      await cancel.getByLabel(a.panel.reason).fill("E2E: mijoz kela olmaydi");
      await cancel.getByRole("button", { name: a.panel.cancel }).click();
      await expect(cancel).toBeHidden();
      await expect(toast(page, a.toast.cancelled).first()).toBeVisible();
      await expect(panel).toContainText(a.status.cancelled);
    }
    watcher.assertClean();
  });

  test("a booked service cannot be deleted and is deactivated instead", async ({ page }) => {
    const watcher = watchPage(page);
    await page.goto("/admin/my-services");
    const services = page.getByRole("region", { name: sv.title });
    await services.getByRole("button", { name: sv.remove(SERVICE) }).click();
    const remove = page.getByRole("alertdialog", { name: sv.removeTitle });
    await remove.getByRole("button", { name: s.remove.confirm }).click();
    const booked = toast(page, sv.bookedTitle);
    await expect(booked).toBeVisible();
    await booked.getByRole("button", { name: sv.deactivate }).click();
    await expect(toast(page, sv.deactivated)).toBeVisible();
    const row = services.getByRole("listitem").filter({ hasText: SERVICE });
    await expect(row).toContainText(sv.inactive);
    await expect(row.getByRole("switch", { name: sv.activeSwitch(SERVICE) })).not.toBeChecked();
    watcher.assertClean();
  });
});
