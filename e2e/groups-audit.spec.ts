import { expect, test } from "@playwright/test";

import { heading, toast, watchPage } from "./helpers";

/**
 * DESIGN §C (add customers to a group by searching) and §D (audit log request ids). Neither
 * spec changes data: the dialog is cancelled, the audit log is only read. Specs run in Uzbek.
 */

test("the add-members dialog finds customers by phone, picks them and checks a pasted list", async ({
  page,
}) => {
  const watcher = watchPage(page);
  // A customer's phone from the list: its national digits are what the admin types.
  await page.goto("/admin/customers");
  const phoneCell = page.locator("table tbody tr").first().locator("td").nth(1);
  const digits = ((await phoneCell.textContent()) ?? "").replace(/\D/g, "").replace(/^998/, "");
  test.skip(digits.length < 9, "the first customer has no phone");

  await page.goto("/admin/customers/groups");
  await expect(heading(page)).toHaveText("Guruhlar");
  await page.locator("table tbody tr").first().getByRole("link").first().click();
  await page.getByRole("button", { name: "Mijoz qo‘shish" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Nothing picked yet: the submit button explains why it cannot act.
  // Its name follows the pick: «Qo‘shish», then «1 ta mijozni qo‘shish».
  const submit = dialog.getByRole("button", { name: /^(Qo‘shish|\d+ ta mijozni qo‘shish)$/ });
  await expect(submit).toHaveAttribute("aria-disabled", "true");

  const search = dialog.getByRole("combobox", { name: "Mijozni qidirish" });
  await search.fill(digits.slice(0, 5));
  // The phone mask shows the national number in groups ("90 123").
  await expect(search).toHaveValue(`${digits.slice(0, 2)} ${digits.slice(2, 5)}`);
  const results = dialog.getByRole("listbox", { name: "Qidiruv natijalari" });
  const options = results.getByRole("option");
  await expect(options.first()).toBeVisible();

  const pickable = results.locator('[role="option"]:not([aria-disabled="true"])').first();
  if ((await pickable.count()) > 0) {
    await search.press("ArrowDown");
    await pickable.click();
    await expect(pickable).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("heading", { name: "Tanlangan mijozlar" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /ro‘yxatdan olib tashlash$/ })).toHaveCount(1);
    await expect(submit).toHaveText(/1 ta mijozni qo‘shish/);
  }
  // Already-members are listed but explain why they cannot be picked.
  const members = results.locator('[role="option"][aria-disabled="true"]');
  if ((await members.count()) > 0) {
    await expect(members.first()).toContainText(/Allaqachon guruhda|O‘chirilgan/);
  }

  // The pasted list is collapsed; a line that is no id or phone is caught before sending.
  await dialog.getByRole("button", { name: "ID yoki telefonlar ro‘yxatini joylashtirish" }).click();
  await dialog.getByLabel("ID yoki telefonlar ro‘yxati").fill("5\nabc");
  await dialog.getByRole("button", { name: /mijozni qo‘shish$/ }).click();
  await expect(dialog.getByRole("alert").first()).toContainText("2-qator («abc»)");
  await expect(dialog.getByLabel("ID yoki telefonlar ro‘yxati")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  await dialog.getByRole("button", { name: "Bekor qilish" }).click();
  await expect(dialog).toBeHidden();
  watcher.assertClean();
});

test("the audit log shows whole request ids, copies one and filters by it", async ({
  page,
  context,
}) => {
  const watcher = watchPage(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/admin/audit-log");
  await expect(heading(page)).toHaveText("Harakatlar jurnali");
  // `has` is relative to the row: the inner locator names the code cell, not the table.
  const row = page
    .locator("table tbody tr")
    .filter({ has: page.locator("code[data-request-id]") })
    .first();
  const code = row.locator("code[data-request-id]");
  await expect(code).toBeVisible();
  const requestId = ((await code.textContent()) ?? "").trim();
  expect(requestId.length).toBeGreaterThanOrEqual(8);

  await row.getByRole("button", { name: "So‘rov ID ni nusxalash" }).click();
  await expect(toast(page, "So‘rov ID nusxalandi")).toBeVisible();

  await row.getByRole("link", { name: `${requestId} so‘rovining barcha yozuvlari` }).click();
  await expect(page).toHaveURL(new RegExp(`request_id=${requestId}`));
  await expect(
    page.getByRole("status").filter({ hasText: "Bitta so‘rov yozuvlari" }),
  ).toBeVisible();
  const codes = page.locator("table tbody code[data-request-id]");
  for (const text of await codes.allTextContents()) expect(text.trim()).toBe(requestId);
  await expect(page.getByLabel("So‘rov ID", { exact: true })).toHaveValue(requestId);

  // A too-short id is refused in place, with the reason.
  const field = page.getByLabel("So‘rov ID", { exact: true });
  await field.fill("abc");
  await field.press("Enter");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Kamida 8 ta belgi kiriting.")).toBeVisible();
  watcher.assertClean();
});
