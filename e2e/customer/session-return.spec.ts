import { expect, test } from "@playwright/test";

import { randomPhone, signUp } from "./helpers";

/**
 * S1: a visitor coming back from another site (Click/Payme) with a lapsed
 * access cookie used to loop between the proxy and the refresh route
 * (ERR_TOO_MANY_REDIRECTS). The refresh route now answers a cross-site
 * request with a same-origin reload, which then refreshes normally. A fresh
 * customer, so rotating its tokens never disturbs the shared storage state.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("a cross-site return with a lapsed access cookie lands on the page", async ({
  page,
  context,
  baseURL,
}) => {
  await signUp(page, randomPhone(), "Qaytish Mijoz");
  await context.clearCookies({ name: /gd_cust_access$/ });
  expect((await context.cookies()).some((c) => /gd_cust_access$/.test(c.name))).toBe(false);

  // A page on another site that sends the browser back, like a payment provider.
  await page.route("https://pay.example/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><title>Pay</title><a id="back" href="${baseURL}/buyurtmalar">Back</a>`,
    }),
  );
  await page.goto("https://pay.example/return");
  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.locator("#back").click();

  await page.waitForURL((url) => url.pathname === "/buyurtmalar", { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Buyurtmalar" })).toBeVisible();
  // One bounce through the refresh route at most, not a loop.
  expect(navigations.filter((url) => url.includes("/api/shop/auth/refresh")).length).toBeLessThan(
    3,
  );
  expect((await context.cookies()).some((c) => /gd_cust_access$/.test(c.name))).toBe(true);
});
