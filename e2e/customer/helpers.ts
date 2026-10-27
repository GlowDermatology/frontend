import { readFileSync } from "node:fs";

import { expect, type Page } from "@playwright/test";

/**
 * Helpers of the signed-in storefront suite. Local backends send the fixed
 * code 123456 by SMS and by e-mail (`ESKIZ_FAKE_CODE`, B-W2 `EMAIL_MODE=fake`).
 */

export const FAKE_CODE = process.env.E2E_FAKE_OTP ?? "123456";
export const PASSWORD = "Glow-derma-2026!";

/** A fresh Uzbek mobile number per run (nine national digits after +998). */
export function randomPhone(): string {
  return `90${String(Math.floor(1_000_000 + Math.random() * 8_999_999))}`;
}

export function randomEmail(): string {
  return `e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Waits until the client islands are interactive (no hydration race on fills). */
export async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
}

/** Sign-up with a phone number or an e-mail address; ends signed in on the home page. */
export async function signUp(page: Page, identifier: string, name = "E2E Mijoz") {
  await page.goto("/kirish?mode=signup");
  await ready(page);
  await page.getByLabel("Telefon raqami yoki email").fill(identifier);
  await page.getByRole("button", { name: "Davom etish" }).click();
  await page.getByLabel("Tasdiqlash kodi").fill(FAKE_CODE);
  await page.getByRole("button", { name: "Tasdiqlash" }).click();
  await page.getByLabel("Ismingiz").fill(name);
  await page.getByLabel("Parol", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hisobni yaratish" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/kirish"), { timeout: 20_000 });
}

/** Password sign-in; a new browser also gets the new-device code step. */
export async function signIn(page: Page, identifier: string) {
  await page.goto("/kirish");
  await ready(page);
  await page.getByLabel("Telefon raqami yoki email").fill(identifier);
  await page.getByLabel("Parol", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  const code = page.getByLabel("Tasdiqlash kodi");
  const home = page.waitForURL((url) => !url.pathname.startsWith("/kirish"), { timeout: 20_000 });
  // `isVisible` does not wait: wait for the step (or the redirect) instead.
  const step = await Promise.race([
    code.waitFor({ state: "visible", timeout: 15_000 }).then(() => "code" as const),
    home.then(() => "home" as const),
  ]).catch(() => "home" as const);
  if (step === "code") {
    await code.fill(FAKE_CODE);
    await page.getByRole("button", { name: "Tasdiqlash" }).click();
  }
  await home;
}

/** Puts the first in-stock catalog product into the cart; returns its name. */
export async function addFirstProduct(page: Page): Promise<string> {
  await page.goto("/katalog?stock=1");
  await page.locator("main a[href^='/mahsulotlar/']").first().click();
  await page.waitForURL(/\/mahsulotlar\//);
  await ready(page);
  const name = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  await page.getByRole("button", { name: "Savatga qo‘shish" }).click();
  await expect(page.getByText("Savatga qo‘shildi")).toBeVisible();
  return name;
}

const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

export async function axe(page: Page) {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => {
    const result = await (
      window as unknown as {
        axe: {
          run: (
            o: unknown,
          ) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: unknown }> }> }>;
        };
      }
    ).axe.run({
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
      },
    });
    return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
  });
}
