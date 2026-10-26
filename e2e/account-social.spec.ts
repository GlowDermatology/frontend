import { expect, test, type Browser, type Page } from "@playwright/test";

import { adminCredentials, BASE_URL } from "./env";
import { heading, toast, watchPage } from "./helpers";

/**
 * The account card in a session that signed in with Google (contract §2.1,
 * `Me.auth_method`, M3), in fake OAuth mode (`GLOWDERMA_OAUTH_MODE=fake`
 * with Google and Facebook enabled, Django `OAUTH_MODE=fake`): the password
 * session links both providers to subjects of its own, a second browser
 * signs in with the Google one, finds no «Bog‘lash» but the password-first
 * hint, and unlinks both from the keyboard — focus stays in each row
 * instead of falling to <body>. The spec unlinks whatever it linked, so the
 * admin is left with no linked identity, as the seed has it.
 */

const LINK_NEEDS_PASSWORD =
  "Ijtimoiy tarmoq orqali ochilgan sessiyada hisob bog‘lab bo‘lmaydi. Chiqing, email va parol bilan qayta kiring, so‘ng «Bog‘lash»ni bosing.";

const PROVIDERS = ["Google", "Facebook"] as const;
type Provider = (typeof PROVIDERS)[number];

async function openSettings(page: Page): Promise<void> {
  await page.goto("/admin/settings");
  await expect(heading(page)).toHaveText("Sozlamalar");
}

/** The fake provider's authorize page: answers with `subject` and the admin's email. */
async function approveFakeProvider(page: Page, provider: Provider, subject: string) {
  await expect(page).toHaveURL(new RegExp(`/admin/auth/oauth/${provider.toLowerCase()}/fake\\?`));
  await page.getByLabel("Identifikator (subject)").fill(subject);
  await page.getByRole("textbox", { name: "Email" }).fill(adminCredentials().email);
  await page.getByRole("button", { name: "Davom etish" }).click();
}

/** Providers this run linked: the cleanup unlinks only these, never an identity it found linked. */
const linkedByRun = new Set<Provider>();

/** Unlinks `provider` from the password session's card when it is linked (the cleanup). */
async function unlinkIfLinked(page: Page, provider: Provider): Promise<void> {
  await openSettings(page);
  const unlink = page.getByRole("button", { name: `${provider} hisobini uzish` });
  if ((await unlink.count()) === 0) return;
  await unlink.click();
  const dialog = page.getByRole("alertdialog", { name: `${provider} hisobini uzasizmi?` });
  await dialog.getByRole("button", { name: "Uzish" }).click();
  await expect(dialog).toBeHidden();
  await expect(unlink).toHaveCount(0);
}

/** A fresh browser context without the suite's password session. */
function anonymousContext(browser: Browser) {
  return browser.newContext({
    baseURL: BASE_URL,
    storageState: { cookies: [], origins: [] },
    ignoreHTTPSErrors: Boolean(process.env.E2E_IGNORE_HTTPS_ERRORS),
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
  });
}

// A run stopped half-way (a failed expectation, a timeout) still leaves no identity linked.
test.afterEach(async ({ page }) => {
  for (const provider of linkedByRun) await unlinkIfLinked(page, provider);
  linkedByRun.clear();
});

test("a Google session sees no «Bog‘lash», and «Uzish» keeps focus in the row", async ({
  page,
  browser,
}) => {
  // Fake mode answers its authorize page (400 without a flow), live mode 404.
  const fake = await page.request.get("/admin/auth/oauth/google/fake");
  test.skip(fake.status() === 404, "fake Google sign-in is not enabled on this frontend");
  await openSettings(page);
  for (const provider of PROVIDERS) {
    test.skip(
      (await page.getByRole("link", { name: `${provider} hisobini bog‘lash` }).count()) === 0,
      `${provider} is not offered for linking (disabled, or already linked: unlink it in Sozlamalar)`,
    );
  }

  const watcher = watchPage(page);
  const run = Date.now();
  const subjects: Record<Provider, string> = {
    Google: `e2e-google-${run}`,
    Facebook: `e2e-facebook-${run}`,
  };
  const social = await anonymousContext(browser);
  try {
    // The password session links both (M3: «Bog‘lash» is offered to it).
    for (const provider of PROVIDERS) {
      await openSettings(page);
      await page.getByRole("link", { name: `${provider} hisobini bog‘lash` }).click();
      linkedByRun.add(provider);
      await approveFakeProvider(page, provider, subjects[provider]);
      await expect(page).toHaveURL(/\/admin\/settings/);
      await expect(toast(page, `${provider} hisobi bog‘landi.`)).toBeVisible();
      await expect(page.getByRole("button", { name: `${provider} hisobini uzish` })).toBeVisible();
    }

    // A second browser signs in with the Google identity.
    const google = await social.newPage();
    const socialWatcher = watchPage(google);
    await google.goto("/admin/login");
    await google.getByRole("link", { name: "Google orqali kirish (sinov)" }).click();
    await approveFakeProvider(google, "Google", subjects.Google);
    await expect(google).not.toHaveURL(/\/admin\/login/);
    await openSettings(google);
    // Both linked: nothing to link, so neither «Bog‘lash» nor the hint yet.
    await expect(google.getByRole("button", { name: "Google hisobini uzish" })).toBeVisible();
    await expect(google.getByText(LINK_NEEDS_PASSWORD)).toHaveCount(0);

    // «Uzish» from the keyboard: Enter on the row's button, Enter on the dialog's.
    for (const provider of ["Facebook", "Google"] as const) {
      const unlink = google.getByRole("button", { name: `${provider} hisobini uzish` });
      await unlink.focus();
      await google.keyboard.press("Enter");
      const dialog = google.getByRole("alertdialog", { name: `${provider} hisobini uzasizmi?` });
      await dialog.getByRole("button", { name: "Uzish" }).focus();
      await google.keyboard.press("Enter");
      await expect(dialog).toBeHidden();
      await expect(toast(google, `${provider} hisobi uzildi`)).toBeVisible();
      const row = google
        .getByRole("list", { name: "Ijtimoiy tarmoq orqali kirish" })
        .getByRole("listitem")
        .filter({ hasText: provider });
      await expect(row).toContainText(/Bog‘lanmagan/i);
      // A Google session cannot link (M3 auth_method): the hint instead of «Bog‘lash» …
      await expect(google.getByText(LINK_NEEDS_PASSWORD)).toBeVisible();
      await expect(google.getByRole("link", { name: /hisobini bog‘lash$/ })).toHaveCount(0);
      // … so the row has no action left: focus stays on the row, never on <body>.
      await expect
        .poll(() => google.evaluate(() => document.activeElement?.tagName))
        .not.toBe("BODY");
      await expect(row).toBeFocused();
    }
    await expect(google.getByRole("link", { name: /hisobini bog‘lash$/ })).toHaveCount(0);
    socialWatcher.assertClean();

    // The password session offers both links again.
    await openSettings(page);
    for (const provider of PROVIDERS) {
      await expect(page.getByRole("link", { name: `${provider} hisobini bog‘lash` })).toBeVisible();
    }
    watcher.assertClean();
  } finally {
    await social.close().catch(() => undefined);
  }
});
