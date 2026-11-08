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
 * Saves a draft titled `title` from the composer and waits for its toast:
 * to the `CUSTOMER_PATH` customer, as the customer card's "Xabar yuborish"
 * opens it (`audience` "one"), or to every device ("all", the stop spec
 * only: its send is meant to be stopped), with the `FAR_FUTURE` requested
 * time when `requested`.
 */
export async function saveDraft(
  page: Page,
  title: string,
  requested = true,
  audience: "one" | "all" = "one",
): Promise<void> {
  const customerId = CUSTOMER_PATH.split("/").at(-1)!;
  await page.goto(
    audience === "one" ? `/admin/notifications?customer=${customerId}` : "/admin/notifications",
  );
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  if (audience === "one") {
    // The customer card's "Xabar yuborish" prefills the recipient.
    await expect(page.getByRole("radio", { name: /Bitta mijoz/ })).toBeChecked();
    await expect(page.getByLabel("Mijoz telefoni").first()).toHaveValue(/^\+998/);
  } else {
    await expect(page.getByRole("radio", { name: /Barcha mijozlar/ })).toBeChecked();
  }
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

/**
 * Opens the campaign panel of `title` from its row and returns the panel. A
 * just-saved draft's panel is open already («Batafsil» is pressed; a click
 * would close it), so the click happens only when the row's panel is shut.
 */
export async function openPanel(page: Page, title: string) {
  const details = historyRow(page, title).getByRole("button", {
    name: `Batafsil: «${title}»`,
  });
  await expect(details).toBeVisible();
  if ((await details.getAttribute("aria-pressed")) !== "true") await details.click();
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
  await expect(
    history.locator("tbody tr").first().or(page.getByText("Xabar topilmadi")),
  ).toBeVisible();
  const leftovers = history.getByRole("button", { name: new RegExp(`^Batafsil: «${prefix} `) });
  const titles: string[] = [];
  for (const label of await leftovers.evaluateAll((buttons) =>
    buttons.map((b) => b.getAttribute("aria-label") ?? ""),
  )) {
    const title = /«(.*)»$/.exec(label)?.[1];
    if (title) titles.push(title);
  }
  for (const title of titles) {
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
    }
    // A sent, sending or stopped campaign (the beat and stop specs leave
    // one each per run): nothing to clean, on to the next.
  }
}
