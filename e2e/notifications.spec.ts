import { expect, test } from "@playwright/test";

import { historyRow, openPanel, removeLeftovers, saveDraft, TITLE_PREFIX } from "./campaigns";
import { BASE_URL, STAFF_STORAGE_STATE, staffCredentials } from "./env";
import { heading, toast, watchPage } from "./helpers";

/**
 * Drafts on `/admin/notifications` (contract §2.8, campaign approval): the
 * composer saves them, the author edits and deletes them, and an ordinary
 * admin sees none of the superuser controls. The superuser workflow (test,
 * confirm, approve, cancel, beat, stop) is in notifications-approval.spec.ts.
 */

test.afterEach(async ({ page }) => {
  await removeLeftovers(page, TITLE_PREFIX);
});

/**
 * The composer saves a draft (contract §2.8, campaign approval): nothing is
 * sent, the row says «Qoralama» with the title and the body, the panel
 * offers the author «Tahrirlash» and «O‘chirish», an edit bumps the
 * revision, and the delete removes the row.
 */
test("a draft is saved, listed with its body, edited and deleted by its author", async ({
  page,
}) => {
  const watcher = watchPage(page);
  const title = `${TITLE_PREFIX} ${Date.now()}`;

  await saveDraft(page, title);
  const row = historyRow(page, title);
  await expect(row).toContainText("Qoralama");
  await expect(row).toContainText("E2E: qoralama, test va tasdiqsiz yuborilmaydi.");

  // Persisted by the backend, not only the board's local history.
  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  await expect(historyRow(page, title)).toContainText("Qoralama");

  const panel = await openPanel(page, title);
  await expect(panel).toContainText("1-tahrir");
  await expect(panel.getByRole("button", { name: "Yuborishni tasdiqlash" })).toHaveCount(0);
  await panel.getByRole("button", { name: "Tahrirlash", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Tahrirlash: «${title}»` })).toBeVisible();
  await expect(page.getByLabel("Sarlavha")).toHaveValue(title);
  await page.getByLabel("Matn").fill("E2E: qoralama o‘zgartirildi, yuborilmaydi.");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Qoralama yangilandi")).toBeVisible();
  await expect(historyRow(page, title)).toContainText("o‘zgartirildi");
  await expect(page.locator("#campaign-panel")).toContainText("2-tahrir");

  // "Orqaga" changes nothing; the delete removes the row and closes the panel.
  const remove = page.locator("#campaign-panel").getByRole("button", { name: "O‘chirish" });
  await remove.click();
  const dialog = page.getByRole("alertdialog", { name: "Qoralama o‘chirilsinmi?" });
  await expect(dialog).toContainText(title);
  await dialog.getByRole("button", { name: "Orqaga" }).click();
  await expect(dialog).toBeHidden();
  await expect(remove).toBeFocused();
  await remove.click();
  await dialog.getByRole("button", { name: "O‘chirish" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, "Qoralama o‘chirildi")).toBeVisible();
  await expect(historyRow(page, title)).toHaveCount(0);
  await expect(page.locator("#campaign-panel")).toHaveCount(0);

  await page.reload();
  await expect(heading(page)).toHaveText("Bildirishnomalar");
  await expect(historyRow(page, title)).toHaveCount(0);
  watcher.assertClean();
});

/**
 * An ordinary admin (not a superuser) sees every campaign but none of the
 * privileged controls: no test devices card, no test, approve, cancel or
 * stop button, and only their own draft's «Tahrirlash» / «O‘chirish». The
 * backend refuses those routes anyway; this checks the client hides them.
 */
test.describe("an ordinary admin", () => {
  test.skip(!staffCredentials(), "E2E_STAFF_PASSWORD is not set: no ordinary staff account");
  test.use({ storageState: STAFF_STORAGE_STATE });

  test("sees no privileged control on any campaign", async ({ page }) => {
    const watcher = watchPage(page);
    const title = `${TITLE_PREFIX} xodim ${Date.now()}`;
    await saveDraft(page, title);
    await expect(page.getByRole("heading", { name: "Test qurilmalari" })).toHaveCount(0);

    const own = await openPanel(page, title);
    await expect(own.getByRole("button", { name: "Tahrirlash", exact: true })).toBeVisible();
    await expect(own.getByRole("button", { name: "O‘chirish" })).toBeVisible();
    for (const name of ["Test yuborish", "Yuborishni tasdiqlash", "Testni tasdiqlash"]) {
      await expect(own.getByRole("button", { name })).toHaveCount(0);
    }

    // The seed's other campaigns: a stranger's draft offers nothing, the
    // approved, sent and cancelled ones offer nothing either.
    const history = page.getByRole("region", { name: "Yuborilgan xabarlar" });
    const others = history.locator("tbody tr").filter({ hasNotText: TITLE_PREFIX });
    const count = Math.min(await others.count(), 6);
    for (let i = 0; i < count; i += 1) {
      await others
        .nth(i)
        .getByRole("button", { name: /^Batafsil/ })
        .click();
      const panel = page.locator("#campaign-panel");
      await expect(panel).toBeVisible();
      for (const name of [
        /^Yuborishni bekor qilish/,
        "Favqulodda to‘xtatish",
        "Qoralamaga qaytarish",
        "Yuborishni tasdiqlash",
        "Test yuborish",
        "Testni tasdiqlash",
      ]) {
        await expect(panel.getByRole("button", { name })).toHaveCount(0);
      }
    }
    watcher.assertClean();
  });

  /**
   * Hiding is not the protection: a privileged Server Action an ordinary
   * admin forces (the request a superuser's browser sends, replayed with the
   * admin's own session and csrf cookie) answers `permission_denied`
   * «Ruxsat yo‘q.» from `requireSuperuser`, before the backend is asked.
   */
  test("a forced superuser action answers permission_denied", async ({ page, browser }) => {
    const watcher = watchPage(page);
    // What a superuser's click sends: the test devices card's registration
    // of an unknown phone (the backend refuses it, nothing is stored).
    const admin = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
    const adminPage = await admin.newPage();
    await adminPage.goto("/admin/notifications");
    const card = adminPage.getByRole("region", { name: "Test qurilmalari" });
    await card.getByLabel("Mijoz telefoni").fill("+998 90 000 00 01");
    await card.getByLabel("Qurilma nomi").fill("e2e yo‘q qurilma");
    const sent = adminPage.waitForRequest(
      (request) => request.method() === "POST" && Boolean(request.headers()["next-action"]),
    );
    await card.getByRole("button", { name: "Qurilma qo‘shish" }).click();
    const request = await sent;
    await expect(card).toContainText("Bu raqam bilan mijoz topilmadi.");
    const headers = request.headers();
    const args = JSON.parse(request.postData() ?? "[]") as unknown[];
    await admin.close();

    // The same action with the ordinary admin's session and csrf token.
    await page.goto("/admin/notifications");
    await expect(heading(page)).toHaveText("Bildirishnomalar");
    const csrf = await page.evaluate(
      () =>
        document.cookie
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith("gd_csrf="))
          ?.slice("gd_csrf=".length) ?? "",
    );
    expect(csrf).not.toBe("");
    args[args.length - 1] = decodeURIComponent(csrf);
    const response = await page.request.post(request.url(), {
      headers: {
        accept: headers["accept"]!,
        "content-type": headers["content-type"]!,
        "next-action": headers["next-action"]!,
        "next-router-state-tree": headers["next-router-state-tree"]!,
        origin: new URL(BASE_URL).origin,
      },
      data: JSON.stringify(args),
    });
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("permission_denied");
    expect(body).toContain("Ruxsat yo‘q.");
    expect(body).not.toContain("customer_not_found");
    watcher.assertClean();
  });
});
