import { expect, type Page } from "@playwright/test";

import { heading, toast } from "./helpers";

/**
 * Shared steps of the campaign specs (notifications.spec.ts,
 * notifications-approval.spec.ts): saving a draft from the composer, the
 * history row and panel of a campaign, and the cleanup of what a stopped
 * run left behind.
 */

/** The generated customer the specs write to (see e2e/README.md). */
const CUSTOMER_PATH = process.env.E2E_CUSTOMER_PATH ?? "/admin/customers/288";

/**
 * The requested send time of the specs' drafts: the last day the API
 * accepts (Django reads years up to 9999). A draft is never sent anyway —
 * only a superuser's approval schedules it — but the far date keeps an
 * approved leftover from ever being due.
 */
const FAR_FUTURE = "9999-12-31T10:00";

/** The title prefix of the drafts notifications.spec.ts saves; its cleanup deletes only these. */
export const TITLE_PREFIX = "e2e qoralama";

/**
 * Saves a draft titled `title` to the `CUSTOMER_PATH` customer with the
 * `FAR_FUTURE` requested time from the composer, as the customer card's
 * "Xabar yuborish" opens it, and waits for its toast.
 */
export async function saveDraft(page: Page, title: string, requested = true): Promise<void> {
  const customerId = CUSTOMER_PATH.split("/").at(-1)!;
  await page.goto(`/admin/notifications?customer=${customerId}`);
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  // The customer card's "Xabar yuborish" prefills the recipient.
  await expect(page.getByRole("radio", { name: /Bitta mijoz/ })).toBeChecked();
  await expect(page.getByLabel("Mijoz telefoni").first()).toHaveValue(/^\+998/);
  await page.getByLabel("Sarlavha").fill(title);
  await page.getByLabel("Matn").fill("E2E: qoralama, test va tasdiqsiz yuborilmaydi.");
  if (requested) {
    await page.getByRole("radio", { name: "Rejalashtirish" }).check();
    const when = page.getByLabel("Yuborish vaqti (Toshkent)");
    await expect(when).toHaveValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    await when.fill(FAR_FUTURE);
  }
  await page.getByRole("button", { name: "Qoralama saqlash" }).click();
  await expect(toast(page, "Qoralama saqlandi")).toBeVisible();
}

/** The history row of `title` (after a reload: what the backend kept). */
export function historyRow(page: Page, title: string) {
  return page
    .getByRole("region", { name: "Yuborilgan xabarlar" })
    .locator("tr")
    .filter({ hasText: title });
}

/** Opens the campaign panel of `title` from its row and returns the panel. */
export async function openPanel(page: Page, title: string) {
  await historyRow(page, title)
    .getByRole("button", { name: `Batafsil: «${title}»` })
    .click();
  const panel = page.locator("#campaign-panel");
  await expect(panel).toContainText(title);
  return panel;
}

/**
 * Whatever a spec left behind — a run that failed before its own cleanup —
 * is removed from the history: a waiting campaign is cancelled, a draft or
 * tested one deleted. Only rows with the given title prefix are touched.
 */
export async function removeLeftovers(page: Page, prefix: string): Promise<void> {
  await page.goto("/admin/notifications");
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  const history = page.getByRole("region", { name: "Yuborilgan xabarlar" });
  const leftovers = history.getByRole("button", { name: new RegExp(`^Batafsil: «${prefix} `) });
  for (let guard = 0; guard < 20; guard += 1) {
    const details = leftovers.first();
    if ((await details.count()) === 0) return;
    const title = /«(.*)»$/.exec((await details.getAttribute("aria-label")) ?? "")?.[1] ?? "";
    const panel = await openPanel(page, title);
    const cancel = panel.getByRole("button", { name: /^Yuborishni bekor qilish/ });
    if ((await cancel.count()) > 0) {
      await cancel.click();
      const dialog = page.getByRole("alertdialog", { name: "Yuborish bekor qilinsinmi?" });
      await dialog.getByRole("button", { name: "Yuborishni bekor qilish" }).click();
      await expect(dialog).toBeHidden();
      await expect(historyRow(page, title)).toContainText("Bekor qilindi");
      // A cancelled campaign goes back to draft, which can be deleted.
      await panel.getByRole("button", { name: "Qoralamaga qaytarish" }).click();
      await expect(toast(page, "Qoralamaga qaytarildi")).toBeVisible();
    }
    const remove = panel.getByRole("button", { name: "O‘chirish" });
    if ((await remove.count()) > 0) {
      await remove.click();
      const dialog = page.getByRole("alertdialog", { name: "Qoralama o‘chirilsinmi?" });
      await dialog.getByRole("button", { name: "O‘chirish" }).click();
      await expect(dialog).toBeHidden();
      await expect(historyRow(page, title)).toHaveCount(0);
    } else {
      // A sent or sending campaign of a stopped run: nothing to clean, leave it.
      return;
    }
  }
}
