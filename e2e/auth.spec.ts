import { expect, test } from "@playwright/test";

import { adminCredentials } from "./env";
import { heading, signIn } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test("an anonymous visit to the admin lands on the login page with a safe next", async ({
  page,
}) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Forders/);
});

test("a wrong password is refused with an alert and no session", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(adminCredentials().email);
  await page.getByLabel("Parol").fill("definitely-not-the-password");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
  const cookies = await page.context().cookies();
  expect(cookies.map((cookie) => cookie.name)).not.toContainEqual(
    expect.stringMatching(/gd_admin_access/),
  );
});

test("sign in, then sign out ends the session", async ({ page }) => {
  await signIn(page);
  await expect(heading(page)).toBeVisible();
  const cookies = await page.context().cookies();
  const access = cookies.find((cookie) => cookie.name.endsWith("gd_admin_access"));
  expect(access?.httpOnly).toBe(true);
  expect(access?.sameSite).toBe("Strict");

  // Sign-out is the last item of the profile menu (the sidebar's user block).
  await page
    .getByRole("button", { name: /^Profil menyusi/ })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Chiqish" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("the sign-in page's language switch re-renders the page and keeps the typed email", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { level: 1, name: "Tizimga kirish" })).toBeVisible();
  await page.getByLabel("Email").fill("someone@glowderma.uz");
  await page.getByRole("button", { name: "Interfeys tili" }).click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("Email")).toHaveValue("someone@glowderma.uz");
  await expect(page.getByRole("button", { name: "Interface language" })).toHaveAttribute(
    "title",
    "English",
  );

  // An empty password is caught before the post: the field is marked and focused.
  await page.locator('button[type="submit"]').click();
  await expect(page.getByLabel("Password")).toBeFocused();
  await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter your password.")).toBeVisible();
});
