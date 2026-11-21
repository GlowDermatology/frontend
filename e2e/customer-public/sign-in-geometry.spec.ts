import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * The sign-in frame's geometry (plan PR 1): the art panel's box and the card's top, left and width
 * are functions of the viewport only, the same for the customer and the staff sign-in, for the
 * sign-in and the sign-up tab, and for the streamed placeholder and the loaded page; a card's
 * height may only grow downward. The frame and the artwork never remount within a page (switching
 * the tabs, or the staff language, which refreshes the route). Anonymous; needs the frontend in
 * api mode (the storefront is served).
 */

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TOLERANCE = 1;

async function boxOf(page: Page, selector: string): Promise<Box> {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} has a box`).not.toBeNull();
  return box as Box;
}

/** `[data-auth-art]` in full, `[data-auth-card]` without its height (a taller step grows down). */
async function frame(page: Page) {
  const art = await boxOf(page, "[data-auth-art]");
  const card = await boxOf(page, "[data-auth-card]");
  return { art, card: { x: card.x, y: card.y, width: card.width } };
}

function expectSame(
  actual: Record<string, number>,
  expected: Record<string, number>,
  what: string,
) {
  for (const key of Object.keys(expected)) {
    expect
      .soft(
        Math.abs((actual[key] ?? Number.NaN) - (expected[key] ?? Number.NaN)),
        `${what}: ${key} ${actual[key]} vs ${expected[key]}`,
      )
      .toBeLessThanOrEqual(TOLERANCE);
  }
}

function expectSameFrame(
  actual: Awaited<ReturnType<typeof frame>>,
  expected: Awaited<ReturnType<typeof frame>>,
  what: string,
) {
  expectSame({ ...actual.art }, { ...expected.art }, `${what} — art`);
  expectSame({ ...actual.card }, { ...expected.card }, `${what} — card`);
}

async function loadedCustomer(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("tablist")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function loadedStaff(page: Page) {
  await page.goto("/admin/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

/** A page without JavaScript keeps the streamed placeholders: the skeleton state, observable. */
async function skeletonFrame(browser: Browser, baseURL: string, viewport: Box, path: string) {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: viewport.width, height: viewport.height },
    storageState: { cookies: [], origins: [] },
  });
  try {
    const page = await context.newPage();
    await page.goto(path, { waitUntil: "load" });
    const placeholder = page.locator("[data-auth-first-step][aria-busy=true]").first();
    if (!(await placeholder.isVisible())) return null;
    return await frame(page);
  } finally {
    await context.close();
  }
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("customer sign-in: tabs, sign-up and the staff sign-in share one frame", async ({
      page,
    }) => {
      await loadedCustomer(page, "/kirish");
      const signIn = await frame(page);
      // The art panel is sized by the viewport alone (from the `nav` breakpoint: 100svh - 40px).
      if (viewport.width >= 1152) {
        expect(Math.abs(signIn.art.height - (viewport.height - 40))).toBeLessThanOrEqual(1);
      }
      const tabs = await boxOf(page, "[role=tablist]");

      // No remount: a marker on the art element survives the tab switch.
      await page.locator("[data-auth-art]").evaluate((element) => {
        element.setAttribute("data-geometry-marker", "1");
      });
      await page.getByRole("tab", { name: "Hisob yaratish" }).click();
      await expect(page.getByRole("tab", { name: "Hisob yaratish" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.locator("[data-auth-art][data-geometry-marker]")).toHaveCount(1);
      expectSameFrame(await frame(page), signIn, "sign-up tab");
      expectSame(
        { ...(await boxOf(page, "[role=tablist]")) },
        { ...tabs },
        "tablist after the switch",
      );
      await page.getByRole("tab", { name: "Kirish" }).click();
      expectSame(
        { ...(await boxOf(page, "[role=tablist]")) },
        { ...tabs },
        "tablist after switching back",
      );

      // The sign-up page loaded on its own, and the other languages.
      await loadedCustomer(page, "/kirish?mode=signup");
      expectSameFrame(await frame(page), signIn, "/kirish?mode=signup");
      expectSame({ ...(await boxOf(page, "[role=tablist]")) }, { ...tabs }, "signup tablist");
      for (const path of ["/ru/sign-in", "/en/sign-in"]) {
        await loadedCustomer(page, path);
        expectSameFrame(await frame(page), signIn, path);
      }

      // The staff sign-in: the same frame.
      await loadedStaff(page);
      expectSameFrame(await frame(page), signIn, "/admin/login");
    });

    test("staff sign-in: the language switch refreshes the card without moving the frame", async ({
      page,
    }) => {
      await loadedStaff(page);
      const before = await frame(page);
      await page.locator("[data-auth-art]").evaluate((element) => {
        element.setAttribute("data-geometry-marker", "1");
      });
      await page.getByRole("button", { name: "Interfeys tili" }).click();
      await page.getByRole("menuitem", { name: "Русский" }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "ru");
      await expect(page.locator("[data-auth-art][data-geometry-marker]")).toHaveCount(1);
      expectSameFrame(await frame(page), before, "staff sign-in in Russian");
    });

    test("the streamed placeholders sit in the loaded frame", async ({
      browser,
      baseURL,
      page,
    }) => {
      await loadedCustomer(page, "/kirish");
      const loaded = await frame(page);
      for (const path of ["/kirish", "/admin/login"]) {
        const skeleton = await skeletonFrame(
          browser,
          baseURL ?? "",
          { ...viewport, x: 0, y: 0 },
          path,
        );
        test.info().annotations.push({
          type: "skeleton",
          description: `${path} at ${viewport.width}px: ${skeleton ? "observed" : "not observable"}`,
        });
        if (skeleton) expectSameFrame(skeleton, loaded, `${path} skeleton`);
      }
    });
  });
}
