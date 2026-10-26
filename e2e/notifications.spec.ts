import { expect, test, type Page } from "@playwright/test";

import { BACKEND_DIR, setCampaignState } from "./backend-shell";
import { heading, toast, watchPage } from "./helpers";

/** The generated customer the specs write to (see e2e/README.md). */
const CUSTOMER_PATH = process.env.E2E_CUSTOMER_PATH ?? "/admin/customers/288";

/**
 * The send time of the spec's message: the last day the API accepts (Django
 * reads years up to 9999), so no beat ever reaches it — a near date would
 * really be sent to the customer.
 */
const FAR_FUTURE = "9999-12-31T10:00";

/** The title prefix of every message the specs schedule; the cleanup cancels only these. */
const TITLE_PREFIX = "e2e rejalashtirilgan";

/**
 * Schedules a push titled `title` to the `CUSTOMER_PATH` customer for
 * `FAR_FUTURE` from the composer, as the customer card's "Xabar yuborish"
 * opens it, and waits for its toast.
 */
async function schedulePush(page: Page, title: string): Promise<void> {
  const customerId = CUSTOMER_PATH.split("/").at(-1)!;
  await page.goto(`/admin/notifications?customer=${customerId}`);
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  // The customer card's "Xabar yuborish" prefills the recipient.
  await expect(page.getByRole("radio", { name: /Bitta mijoz/ })).toBeChecked();
  await expect(page.getByLabel("Mijoz telefoni")).toHaveValue(/^\+998/);
  await page.getByLabel("Sarlavha").fill(title);
  await page.getByLabel("Matn").fill("E2E: rejalashtirilgan xabar, yuborilmaydi.");
  await page.getByRole("radio", { name: "Rejalashtirish" }).check();
  const when = page.getByLabel("Yuborish vaqti (Toshkent)");
  await expect(when).toHaveValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  await when.fill(FAR_FUTURE);
  await page.getByRole("button", { name: "Rejalashtirish" }).click();
  await expect(toast(page, /31-dek, 10:00 ga rejalashtirildi/)).toBeVisible();
}

/** The history row of `title` (after a reload: what the backend kept). */
function historyRow(page: Page, title: string) {
  return page
    .getByRole("region", { name: "Yuborilgan xabarlar" })
    .locator("tr")
    .filter({ hasText: title });
}

/**
 * Whatever a spec left scheduled — a run that failed before its own cancel —
 * is cancelled from the history, so no run leaves a message waiting for
 * 9999. Only rows with the specs' own title prefix are touched.
 */
test.afterEach(async ({ page }) => {
  await page.goto("/admin/notifications");
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  const leftovers = page
    .getByRole("region", { name: "Yuborilgan xabarlar" })
    .getByRole("button", { name: new RegExp(`^Bekor qilish: «${TITLE_PREFIX} `) });
  const dialog = page.getByRole("alertdialog", {
    name: "Rejalashtirilgan xabar bekor qilinsinmi?",
  });
  for (let left = await leftovers.count(); left > 0; left -= 1) {
    await leftovers.first().click();
    await dialog.getByRole("button", { name: "Bekor qilish" }).click();
    await expect(dialog).toBeHidden();
    await expect(leftovers).toHaveCount(left - 1);
  }
});

/**
 * A scheduled push to one customer (contract §2.8): never sent by the run
 * itself, and scheduled at `FAR_FUTURE` so the backend's beat never sends it
 * either. The spec then cancels it from the history ("Bekor qilish", M3), so
 * a run leaves one cancelled message with a unique title and nothing
 * scheduled.
 */
test("a push scheduled for one customer is listed as scheduled, then cancelled", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const title = `${TITLE_PREFIX} ${Date.now()}`;

  await schedulePush(page, title);
  await expect(historyRow(page, title)).toContainText("Rejalashtirilgan");

  // Persisted by the backend, not only the board's local history.
  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  const saved = historyRow(page, title);
  await expect(saved).toContainText("Rejalashtirilgan");

  // Cancel it before any send (POST notifications/{id}/cancel/, M3).
  const cancel = saved.getByRole("button", { name: `Bekor qilish: «${title}»` });
  await cancel.click();
  const dialog = page.getByRole("alertdialog", {
    name: "Rejalashtirilgan xabar bekor qilinsinmi?",
  });
  await expect(dialog).toContainText(title);
  // "Orqaga" changes nothing and gives focus back to the row's button.
  await dialog.getByRole("button", { name: "Orqaga" }).click();
  await expect(dialog).toBeHidden();
  await expect(cancel).toBeFocused();
  await expect(saved).toContainText("Rejalashtirilgan");

  await cancel.click();
  await dialog.getByRole("button", { name: "Bekor qilish" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Xabar bekor qilindi")).toBeVisible();
  await expect(saved).toContainText("Bekor qilindi");
  await expect(saved.getByRole("button", { name: /^Bekor qilish/ })).toHaveCount(0);

  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  await expect(historyRow(page, title)).toContainText("Bekor qilindi");
  watcher.assertClean();
});

/**
 * The backend refuses the cancel once the send started (409 `conflict`):
 * the spec moves its campaign to `queued` through the backend shell while
 * the dialog is open, as the beat would when it is due. The board closes the
 * dialog, says why, shows the row as the backend now has it (the Server
 * Action re-read the history) and puts focus on the history table. The
 * campaign is moved back to `scheduled` and cancelled by the cleanup.
 */
test("a cancel the backend refuses because the send started re-reads the history", async ({
  page,
}) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: no way to start a campaign's send");
  const watcher = watchPage(page);
  const title = `${TITLE_PREFIX} ${Date.now()}`;
  await schedulePush(page, title);
  await page.reload();
  const row = historyRow(page, title);
  await expect(row).toContainText("Rejalashtirilgan");

  await row.getByRole("button", { name: `Bekor qilish: «${title}»` }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "Rejalashtirilgan xabar bekor qilinsinmi?",
  });
  await expect(dialog).toContainText(title);
  setCampaignState(title, "scheduled", "queued");
  try {
    await dialog.getByRole("button", { name: "Bekor qilish" }).click();
    await expect(dialog).toBeHidden();
    await expect(toast(page, "Amal bajarilmadi")).toContainText(
      "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.",
    );
    // Re-read, not only closed: the row shows the started send and offers nothing.
    await expect(row).toContainText("Navbatda");
    await expect(row.getByRole("button", { name: /^Bekor qilish/ })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Yuborilgan xabarlar" })).toBeFocused();
    watcher.assertClean();
  } finally {
    setCampaignState(title, "queued", "scheduled");
  }
});
