import { expect, test } from "@playwright/test";

import { BACKEND_DIR, deleteStaffAccounts } from "./backend-shell";
import { adminCredentials } from "./env";
import { heading, toast, watchPage } from "./helpers";
import { expectDisabledReason } from "./ui";

/**
 * Staff management (gap FND-4, contract §2.16, DESIGN §E): the seeded admin is a
 * manager. The spec invites an `e2e-…` account with the «Kirish usuli» choice set to a
 * temporary password (shown once, with the "must change at first sign-in" note; the row
 * carries «Parol o‘rnatilmagan»), renames it, resets its password (the same choice inside a
 * confirmation dialog), deactivates and reactivates it, and checks the own row offers no
 * deactivation, reset or link. When the backend can e-mail links
 * (`capabilities.staff_email_invite`) it also resends a link and sees «Havola yuborilgan»;
 * otherwise the e-mail options are refused with their reason. Staff accounts are never
 * deleted through the API, so the account is removed through the backend shell afterwards.
 */

const EMAIL_PREFIX = "e2e-xodim-";

test.afterEach(() => {
  if (BACKEND_DIR) deleteStaffAccounts(EMAIL_PREFIX);
});

test("a manager invites, edits, resets and deactivates a staff account", async ({ page }) => {
  test.skip(!BACKEND_DIR, "E2E_BACKEND_DIR is not set: the invited account could not be removed");
  const watcher = watchPage(page);
  const stamp = Date.now();
  const email = `${EMAIL_PREFIX}${stamp}@glowderma.uz`;

  await page.goto("/admin/staff");
  await expect(heading(page)).toHaveText("Xodimlar");
  // The manager sees the item in the sidebar.
  await expect(
    page
      .getByRole("navigation", { name: "Admin bo‘limlari" })
      .first()
      .getByRole("link", { name: "Xodimlar" }),
  ).toBeVisible();
  // Their own row: no deactivation, no reset, no link.
  const { email: adminEmail } = adminCredentials();
  const own = page.locator("tr").filter({ hasText: adminEmail });
  await own.getByRole("button", { name: /— amallar$/ }).click();
  await expect(page.getByRole("menuitem", { name: "Tahrirlash" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Faolsizlantirish" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Parolni tiklash" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Havolani qayta yuborish" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Invite: the taken email is refused on its field, then the new one gets a password once.
  await page.getByRole("button", { name: "Yangi xodim" }).click();
  const invite = page.getByRole("dialog", { name: "Yangi xodim" });
  const methods = invite.getByRole("group", { name: "Kirish usuli" });
  await expect(methods.getByRole("radio")).toHaveCount(3);
  const emailOption = methods.getByRole("radio", { name: /^Email orqali havola/ });
  const emailInvite = (await emailOption.getAttribute("aria-disabled")) !== "true";
  if (!emailInvite) {
    // Refused, not hidden: the reason says what to do instead.
    await expectDisabledReason(emailOption, "E-pochta orqali yuborish sozlanmagan");
    await expectDisabledReason(
      methods.getByRole("radio", { name: /^Ikkalasi/ }),
      "E-pochta orqali yuborish sozlanmagan",
    );
  }
  await methods.getByText("Vaqtinchalik parol", { exact: true }).click();
  await expect(methods.getByRole("radio", { name: /^Vaqtinchalik parol/ })).toBeChecked();
  await invite.getByLabel("Email", { exact: true }).fill(adminEmail);
  await invite.getByLabel("To‘liq ism").fill("E2E Xodim");
  await invite.getByRole("button", { name: "Xodim qo‘shish" }).click();
  // On the field (the error summary above the form repeats it as a link to the field).
  await expect(
    invite.locator('[id$="-error"]').filter({ hasText: /Bu email bilan xodim allaqachon bor/ }),
  ).toBeVisible();
  await invite.getByLabel("Email", { exact: true }).fill(email);
  await invite.getByRole("button", { name: "Xodim qo‘shish" }).click();
  const password = page.getByRole("dialog", { name: "Xodim qo‘shildi" });
  await expect(password.getByTestId("temporary-password")).toHaveText(
    /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/,
  );
  await expect(password).toContainText("Parolni xodimga shaxsan bering");
  await expect(password).toContainText("Birinchi kirishda parolni almashtirish majburiy.");
  await expect(password.getByRole("button", { name: "Nusxa olish" })).toBeVisible();
  await password.getByRole("button", { name: "Tayyor" }).click();
  await expect(password).toBeHidden();

  const row = page.locator("tr").filter({ hasText: email });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Hali kirmagan");
  await expect(row).toContainText("Parol o‘rnatilmagan");

  // Rename.
  await row.getByRole("button", { name: /— amallar$/ }).click();
  await page.getByRole("menuitem", { name: "Tahrirlash" }).click();
  const edit = page.getByRole("dialog", { name: "Xodimni tahrirlash" });
  await edit.getByLabel("To‘liq ism").fill("E2E Xodim Yangi");
  await edit.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Xodim saqlandi")).toBeVisible();
  await expect(row).toContainText("E2E Xodim Yangi");

  // Reset the password: confirmed with the same choice, a new one shown once.
  await row.getByRole("button", { name: /— amallar$/ }).click();
  await page.getByRole("menuitem", { name: "Parolni tiklash" }).click();
  const reset = page.getByRole("dialog", { name: "Parolni tiklaysizmi?" });
  await expect(reset).toContainText("barcha sessiyalari tugatiladi");
  await reset
    .getByRole("group", { name: "Kirish usuli" })
    .getByText("Vaqtinchalik parol", { exact: true })
    .click();
  await reset.getByRole("button", { name: "Parolni tiklash" }).click();
  const renewed = page.getByRole("dialog", { name: "Yangi vaqtinchalik parol" });
  await expect(renewed.getByTestId("temporary-password")).toBeVisible();
  await expect(renewed).toContainText("Birinchi kirishda parolni almashtirish majburiy.");
  await renewed.getByRole("button", { name: "Tayyor" }).click();
  await expect(row).toContainText("Parol o‘rnatilmagan");

  // «Havolani qayta yuborish»: only when the backend can e-mail links.
  await row.getByRole("button", { name: /— amallar$/ }).click();
  const resend = page.getByRole("menuitem", { name: "Havolani qayta yuborish" });
  if (emailInvite) {
    await resend.click();
    const confirmResend = page.getByRole("alertdialog", { name: "Havolani qayta yuborasizmi?" });
    await confirmResend.getByRole("button", { name: "Havolani yuborish" }).click();
    const sent = page.getByRole("dialog", { name: "Havola yuborildi" });
    await expect(sent).toContainText(email);
    await expect(sent.getByTestId("temporary-password")).toHaveCount(0);
    await sent.getByRole("button", { name: "Tayyor" }).click();
    await expect(row).toContainText("Havola yuborilgan");
  } else {
    // Offered but refused with the reason (disabled menu item + its explanation).
    await expectDisabledReason(resend, "E-pochta orqali yuborish sozlanmagan");
    await page.keyboard.press("Escape");
  }

  // Deactivate: confirmed, then listed under «Nofaol»; reactivate from there.
  await row.getByRole("button", { name: /— amallar$/ }).click();
  await page.getByRole("menuitem", { name: "Faolsizlantirish" }).click();
  const deactivate = page.getByRole("alertdialog", { name: "Xodimni faolsizlantirasizmi?" });
  await expect(deactivate).toContainText("sessiyalari darhol tugatiladi");
  await deactivate.getByRole("button", { name: "Faolsizlantirish" }).click();
  await expect(toast(page, "Xodim faolsizlantirildi")).toBeVisible();
  await expect(row).toHaveCount(0);

  await page.getByRole("radio", { name: "Nofaol" }).click();
  await expect(page).toHaveURL(/status=inactive/);
  const inactive = page.locator("tr").filter({ hasText: email });
  await expect(inactive).toContainText("Nofaol");
  await inactive.getByRole("button", { name: /— amallar$/ }).click();
  await page.getByRole("menuitem", { name: "Qayta faollashtirish" }).click();
  await page
    .getByRole("alertdialog", { name: "Xodimni qayta faollashtirasizmi?" })
    .getByRole("button", { name: "Qayta faollashtirish" })
    .click();
  await expect(toast(page, "Xodim qayta faollashtirildi")).toBeVisible();

  // Search folds case: the account is found under «Faol» again.
  await page.goto(`/admin/staff?q=${encodeURIComponent("E2E XODIM YANGI")}`);
  await expect(page.locator("tr").filter({ hasText: email })).toBeVisible();
  watcher.assertClean();
});
