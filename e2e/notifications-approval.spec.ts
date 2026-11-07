import { expect, test, type Page } from "@playwright/test";

import {
  BACKEND_DIR,
  deleteTestDevices,
  ensurePushableDevice,
  runCampaignBeat,
  setCampaignState,
} from "./backend-shell";
import { historyRow, openPanel, removeLeftovers, saveDraft } from "./campaigns";
import { heading, toast, watchPage } from "./helpers";

/**
 * The campaign approval workflow as a superuser (contract §2.8): register
 * the customer's device as a test device, send a test push, confirm it,
 * approve the send, watch the countdown and cancel; a second draft is
 * approved and the beat sends it to the fake FCM («Yuborildi»); a cancel
 * the backend refuses because the send started re-reads the history.
 *
 * Needs the backend shell (`E2E_BACKEND_DIR`) for the pushable device, the
 * beat and the state change, and a backend running with
 * `CAMPAIGN_APPROVAL_DELAY_MINUTES=0` and `FCM_MODE=fake`, so a campaign
 * approved without a requested time is due at once and no real push goes
 * anywhere. The seeded admin (`E2E_ADMIN_EMAIL`) must be a superuser.
 */

const TITLE_PREFIX = "e2e tasdiq";
const DEVICE_PREFIX = "e2e qurilma";

test.beforeEach(() => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: no test device, beat or state change");
});

test.afterEach(async ({ page }) => {
  await removeLeftovers(page, TITLE_PREFIX);
  if (BACKEND_DIR) deleteTestDevices(DEVICE_PREFIX);
});

/** The recipient's phone (the composer's prefill), e.g. `+998901234567`. */
async function recipientPhone(page: Page): Promise<string> {
  const customerId = (process.env.E2E_CUSTOMER_PATH ?? "/admin/customers/288").split("/").at(-1)!;
  await page.goto(`/admin/notifications?customer=${customerId}`);
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  const masked = await page.getByLabel("Mijoz telefoni").first().inputValue();
  return `+${masked.replace(/\D/g, "")}`;
}

/** Registers the customer's device under `label` from the test devices card. */
async function registerDevice(page: Page, phone: string, label: string): Promise<void> {
  const card = page.getByRole("region", { name: "Test qurilmalari" });
  await card.getByLabel("Mijoz telefoni").fill(phone);
  await card.getByLabel("Qurilma nomi").fill(label);
  await card.getByRole("button", { name: "Qurilma qo‘shish" }).click();
  await expect(toast(page, "Test qurilmasi qo‘shildi")).toBeVisible();
  await expect(card).toContainText(label);
  await expect(card.locator("li").filter({ hasText: label })).toContainText("Push bor");
}

/** Test push → confirm → the campaign is «Test tasdiqlangan» and offers the approval. */
async function testAndConfirm(page: Page, title: string, label: string): Promise<void> {
  const panel = await openPanel(page, title);
  await panel.getByRole("button", { name: "Test yuborish" }).click();
  const dialog = page.getByRole("dialog", { name: "Test yuborish" });
  await expect(dialog).toContainText(title);
  const device = dialog.getByRole("checkbox", { name: new RegExp(label) });
  await expect(device).toBeChecked();
  await dialog.getByRole("button", { name: "Test yuborish" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Test yuborildi")).toBeVisible();
  const tests = panel
    .getByRole("region", { name: "Test yuborishlar" })
    .or(panel.locator("section"));
  await expect(tests.first()).toContainText("Qurilmaga yetkazildi");
  // Not approvable before the confirmation.
  await expect(panel.getByRole("button", { name: "Yuborishni tasdiqlash" })).toHaveCount(0);
  await panel.getByRole("button", { name: "Testni tasdiqlash" }).click();
  await expect(toast(page, "Test tasdiqlandi")).toBeVisible();
  await expect(historyRow(page, title)).toContainText("Test tasdiqlangan");
  await expect(panel).toContainText("Tasdiqlangan");
}

/** Approves from the panel through the summary dialog; the row then waits («Rejalashtirilgan»). */
async function approve(page: Page, title: string): Promise<void> {
  const panel = page.locator("#campaign-panel");
  await panel.getByRole("button", { name: "Yuborishni tasdiqlash" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Yuborish tasdiqlansinmi?" });
  await expect(dialog).toContainText(title);
  await expect(dialog).toContainText("Taxminiy qurilmalar");
  await expect(dialog).toContainText("Yuborilgan push xabarni qaytarib bo‘lmaydi.");
  await dialog.getByRole("button", { name: "Yuborishni tasdiqlash" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Yuborish tasdiqlandi")).toBeVisible();
  await expect(historyRow(page, title)).toContainText("Rejalashtirilgan");
}

test("register device → test → confirm → approve → countdown → cancel → back to draft", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const title = `${TITLE_PREFIX} ${Date.now()}`;
  const label = `${DEVICE_PREFIX} ${Date.now()}`;
  const phone = await recipientPhone(page);
  ensurePushableDevice(phone);

  await saveDraft(page, title);
  await registerDevice(page, phone, label);
  // A draft cannot be approved: the panel offers the test first.
  const panel = await openPanel(page, title);
  await expect(panel.getByRole("button", { name: "Yuborishni tasdiqlash" })).toHaveCount(0);
  await testAndConfirm(page, title, label);
  await approve(page, title);

  // Requested for 31 Dec 9999: the countdown runs, the beat never reaches it.
  const cancel = panel.getByRole("button", { name: /^Yuborishni bekor qilish/ });
  await expect(cancel).toContainText(/\d+:\d{2}/);
  await expect(panel).toContainText("dan keyin");
  await cancel.click();
  const dialog = page.getByRole("alertdialog", { name: "Yuborish bekor qilinsinmi?" });
  await expect(dialog).toContainText(/Yuborishgacha \d+:\d{2}/);
  await dialog.getByRole("button", { name: "Orqaga" }).click();
  await expect(dialog).toBeHidden();
  await cancel.click();
  await dialog.getByRole("button", { name: "Yuborishni bekor qilish" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Xabar bekor qilindi")).toBeVisible();
  await expect(historyRow(page, title)).toContainText("Bekor qilindi");

  // Back to draft: the confirmation is gone, a new test is needed.
  await panel.getByRole("button", { name: "Qoralamaga qaytarish" }).click();
  await expect(toast(page, "Qoralamaga qaytarildi")).toBeVisible();
  await expect(historyRow(page, title)).toContainText("Qoralama");
  await expect(panel).toContainText("2-tahrir");
  await expect(panel.getByRole("button", { name: "Yuborishni tasdiqlash" })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Test yuborish" })).toBeVisible();

  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  await expect(historyRow(page, title)).toContainText("Qoralama");
  watcher.assertClean();
});

test("an approved campaign without a requested time is sent by the beat («Yuborildi»)", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const title = `${TITLE_PREFIX} beat ${Date.now()}`;
  const label = `${DEVICE_PREFIX} ${Date.now()}`;
  const phone = await recipientPhone(page);
  ensurePushableDevice(phone);

  await saveDraft(page, title, false);
  await registerDevice(page, phone, label);
  await testAndConfirm(page, title, label);
  await approve(page, title);
  // Nothing was sent by the approval itself: the row waits for the beat.
  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  await expect(historyRow(page, title)).toContainText("Rejalashtirilgan");

  // The beat (delay 0: due at once) sends it to the fake FCM inside the call.
  const started = runCampaignBeat();
  expect(started.length).toBeGreaterThan(0);
  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  const row = historyRow(page, title);
  await expect(row).toContainText("Yuborildi");
  await expect(row.locator("td").nth(4)).toContainText("1");
  const panel = await openPanel(page, title);
  await expect(panel.getByRole("button", { name: /^Yuborishni bekor qilish/ })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Qoralamaga qaytarish" })).toHaveCount(0);
  watcher.assertClean();
});

test("a cancel the backend refuses because the send started re-reads the history", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const title = `${TITLE_PREFIX} refused ${Date.now()}`;
  const label = `${DEVICE_PREFIX} ${Date.now()}`;
  const phone = await recipientPhone(page);
  ensurePushableDevice(phone);

  await saveDraft(page, title);
  await registerDevice(page, phone, label);
  await testAndConfirm(page, title, label);
  await approve(page, title);
  const panel = page.locator("#campaign-panel");
  await panel.getByRole("button", { name: /^Yuborishni bekor qilish/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Yuborish bekor qilinsinmi?" });
  await expect(dialog).toContainText(title);
  setCampaignState(title, "scheduled", "sending");
  try {
    await dialog.getByRole("button", { name: "Yuborishni bekor qilish" }).click();
    await expect(dialog).toBeHidden();
    await expect(toast(page, "Amal bajarilmadi")).toContainText(
      "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.",
    );
    // Re-read, not only closed: the row shows the started send and the panel the stop.
    await expect(historyRow(page, title)).toContainText("Yuborilmoqda");
    await expect(panel.getByRole("button", { name: /^Yuborishni bekor qilish/ })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Favqulodda to‘xtatish" })).toBeVisible();
    watcher.assertClean();
  } finally {
    setCampaignState(title, "sending", "scheduled");
  }
});
