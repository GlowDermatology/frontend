import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { BASE_URL } from "./env";

/**
 * The colour theme (cookie `gd_theme` = light | dark, none = follow the device) and the menus
 * that carry it: the storefront account menu («Til ›» submenu + «Mavzu»), the phone menu, the
 * admin profile menu, Settings and the sign-in brand rows. Runs in the admin project (signed-in
 * staff); the storefront pages need no customer session.
 */

const theme = (page: Page) => page.locator("html");

/** Records `<html data-theme>` when `<body>` first appears, i.e. before the first paint. */
async function recordFirstPaintTheme(page: Page) {
  await page.addInitScript(() => {
    const record = () => {
      if (document.body && !("firstPaintTheme" in window)) {
        (window as unknown as { firstPaintTheme: string | undefined }).firstPaintTheme =
          document.documentElement.dataset.theme;
        return true;
      }
      return false;
    };
    if (!record()) {
      const observer = new MutationObserver(() => {
        if (record()) observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
    }
  });
}

/**
 * Waits until every menu has left: a closing menu plays a short exit animation, and Radix lets
 * that closing layer dismiss a menu reopened under it, so a reopen waits for it.
 */
async function menusClosed(page: Page) {
  await expect(page.getByRole("menu")).toHaveCount(0);
}

async function setThemeCookie(context: BrowserContext, value: "light" | "dark") {
  await context.addCookies([{ name: "gd_theme", value, url: BASE_URL }]);
}

async function themeCookie(context: BrowserContext) {
  return (await context.cookies()).find((cookie) => cookie.name === "gd_theme")?.value;
}

test.describe("first paint", () => {
  test("a dark cookie paints dark at once, on the store and in the admin", async ({
    page,
    context,
  }) => {
    await setThemeCookie(context, "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await recordFirstPaintTheme(page);
    for (const path of ["/", "/admin", "/admin/login"]) {
      await page.goto(path);
      expect(
        await page.evaluate(() => (window as { firstPaintTheme?: string }).firstPaintTheme),
      ).toBe("dark");
      await expect(theme(page)).toHaveAttribute("data-theme", "dark");
      await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute(
        "content",
        path === "/" ? "#101713" : "#14110d",
      );
    }
  });

  test("without a cookie the theme follows the device, live", async ({ page, context }) => {
    await context.clearCookies({ name: "gd_theme" });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(theme(page)).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(theme(page)).toHaveAttribute("data-theme", "light");
  });
});

test("the store's account menu switches the theme and keeps it, store ↔ admin", async ({
  page,
  context,
}) => {
  await context.clearCookies({ name: "gd_theme" });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Hisob va til" }).click();
  const themes = page.getByRole("group", { name: "Mavzu" });
  await themes.getByRole("menuitemradio", { name: "Qorong‘i" }).click();
  await expect(theme(page)).toHaveAttribute("data-theme", "dark");
  // The menu stays open to compare.
  await expect(page.getByRole("menuitem", { name: "Kirish" })).toBeVisible();
  await expect(themes.getByRole("menuitemradio", { name: "Qorong‘i" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect.poll(() => themeCookie(context)).toBe("dark");

  await page.reload();
  await expect(theme(page)).toHaveAttribute("data-theme", "dark");
  await page.goto("/admin");
  await expect(theme(page)).toHaveAttribute("data-theme", "dark");

  // The admin profile menu: Settings, «Til ›», «Mavzu», «Chiqish»; it opens upward.
  const trigger = page.getByRole("button", { name: /^Profil menyusi/ }).first();
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Profil menyusi" });
  await expect(menu.getByRole("menuitem", { name: "Sozlamalar" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Chiqish" })).toBeVisible();
  const menuBox = await menu.boundingBox();
  const triggerBox = await trigger.boundingBox();
  expect(menuBox && triggerBox && menuBox.y + menuBox.height <= triggerBox.y + 1).toBe(true);
  await menu.getByRole("menuitemradio", { name: "Yorug‘" }).click();
  await expect(theme(page)).toHaveAttribute("data-theme", "light");
  await expect.poll(() => themeCookie(context)).toBe("light");
  await page.keyboard.press("Escape");
  await menusClosed(page);

  // «Til ›» lists the admin languages with the current one checked (not changed here: the
  // choice is saved on the account).
  await trigger.click();
  await menu.getByRole("menuitem", { name: /^Til\b/ }).hover();
  const languages = page.getByRole("menu", { name: "Interfeys tili" });
  await expect(languages.getByRole("menuitemradio", { name: "O‘zbekcha" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(languages.getByRole("menuitemradio", { name: "Русский" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await page.keyboard.press("Escape");

  await page.goto("/");
  await expect(theme(page)).toHaveAttribute("data-theme", "light");
});

test("Settings offers the same switch; «Qurilmadagidek» deletes the cookie", async ({
  page,
  context,
}) => {
  await setThemeCookie(context, "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/admin/settings");
  const group = page.getByRole("radiogroup", { name: "Mavzu" });
  await expect(group.getByRole("radio", { name: "Qorong‘i" })).toBeChecked();
  // The label sits under the (transparent) native radio, which takes the click.
  await group.getByRole("radio", { name: "Qurilmadagidek" }).check();
  await expect(theme(page)).toHaveAttribute("data-theme", "light");
  await expect.poll(() => themeCookie(context)).toBeUndefined();
});

test.describe("the store's language submenu", () => {
  test("opens on hover and from the keyboard", async ({ page }) => {
    await page.goto("/katalog?q=krem");
    await page.getByRole("button", { name: "Hisob va til" }).click();
    const row = page.getByRole("menuitem", { name: /^Til\b/ });
    await row.hover();
    const submenu = page.getByRole("menu", { name: "Til", exact: true });
    await expect(submenu.getByRole("menuitem", { name: "English" })).toHaveAttribute(
      "href",
      "/en/catalog?q=krem",
    );
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await menusClosed(page);

    // Keyboard: Enter opens the menu, → opens the submenu on the language row, ← closes it.
    await page.getByRole("button", { name: "Hisob va til" }).focus();
    await page.keyboard.press("Enter");
    await row.focus();
    await page.keyboard.press("ArrowRight");
    await expect(submenu.getByRole("menuitem").first()).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(submenu).toBeHidden();
    await expect(row).toBeFocused();
  });

  test("expands in place on a phone (a tap), next to the theme row", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ru/catalog");
    await page.getByRole("button", { name: "Аккаунт и язык" }).click();
    const row = page.getByRole("menuitem", { name: /^Язык/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    const inline = page.getByRole("group", { name: "Язык", exact: true });
    await expect(inline.getByRole("menuitem", { name: "O‘zbekcha" })).toHaveAttribute(
      "href",
      "/katalog",
    );
    await expect(page.getByRole("group", { name: "Тема" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page.keyboard.press("Escape");

    // The phone menu's foot: the languages, then the theme switch.
    await page.getByRole("button", { name: "Открыть меню" }).click();
    await expect(page.getByRole("banner").getByRole("radiogroup", { name: "Тема" })).toBeVisible();
  });
});

test("the sign-in brand rows carry the theme menu", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: "light" });
  for (const path of ["/kirish", "/admin/login"]) {
    await page.goto(new URL(path, BASE_URL).toString());
    await page.locator("button[data-theme-menu]").click();
    await page.getByRole("menuitemradio", { name: "Qorong‘i" }).click();
    await expect(theme(page)).toHaveAttribute("data-theme", "dark");
    await menusClosed(page);
    await page.locator("button[data-theme-menu]").click();
    await page.getByRole("menuitemradio", { name: "Qurilmadagidek" }).click();
    await expect(theme(page)).toHaveAttribute("data-theme", "light");
  }
  await context.close();
});
