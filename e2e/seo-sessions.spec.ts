import { expect, test, type Page } from "@playwright/test";

import { BACKEND_DIR, clearCategorySeo, restoreProductSeo } from "./backend-shell";
import { randomPhone, signUp } from "./customer/helpers";
import { heading, toast, watchPage } from "./helpers";

/**
 * Website SEO and «Faol seanslar» in the admin (B-W1; admin contract §2.3,
 * §2.4, §2.6). The SEO specs edit the seed's product 1 and the «Serumlar»
 * category and put back what they found (through the UI, and through the
 * backend shell when a run stopped half-way); the session spec signs up a
 * fresh customer on the storefront, signs that browser out from the
 * customer card and checks the storefront lost the session.
 */

const PRODUCT_PATH = "/admin/products/1";

function seoCard(page: Page) {
  return page.getByRole("region", { name: "SEO", exact: true });
}

function seoStatus(page: Page) {
  return page.getByTestId("seo-status");
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(toast(page, "Mahsulot saqlandi")).toBeVisible();
}

test.describe("SEO", () => {
  // What a stopped run must put back (the UI restores it at the end of a passing one).
  let original: { slug: string; enDescription: string } | null = null;
  let categoryTouched = false;

  test.afterEach(() => {
    if (BACKEND_DIR && original) restoreProductSeo(1, original.slug, original.enDescription);
    if (BACKEND_DIR && categoryTouched) clearCategorySeo("serums");
    original = null;
    categoryTouched = false;
  });

  test("the product's slug, SEO texts and «SEO holati» round-trip", async ({ page }) => {
    const watcher = watchPage(page);
    await page.goto("/admin/products/2");
    const otherSlug = await page.getByLabel("Manzil (slug)").inputValue();

    await page.goto(PRODUCT_PATH);
    await expect(heading(page)).toHaveText("Mahsulotni tahrirlash");
    const card = seoCard(page);
    const slug = page.getByLabel("Manzil (slug)");
    const slugBefore = await slug.inputValue();
    await page
      .getByRole("tab", { name: /English/ })
      .first()
      .click();
    const enDescription = page.locator('textarea[name="texts.en.description"]');
    original = { slug: slugBefore, enDescription: await enDescription.inputValue() };
    expect(slugBefore).toMatch(/^[a-z0-9-]+$/);
    await expect(card.getByTestId("slug-preview")).toHaveText(
      new RegExp(`/mahsulotlar/${slugBefore}$`),
    );

    // Live check of a digits-only slug, then the server's `unique` refusal.
    await slug.fill("12345");
    await expect(
      card.getByText("Faqat lotin kichik harflari, raqamlar va chiziqcha (faqat raqam emas)."),
    ).toBeVisible();
    await slug.fill(otherSlug);
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(card.getByText("Bu manzil (slug) boshqa mahsulotda bor.")).toBeVisible();
    await expect(slug).toBeFocused();

    // A new slug, SEO texts of ideal length and the missing en description.
    const newSlug = `${slugBefore}-e2e`;
    await slug.fill(newSlug);
    await expect(card.getByTestId("slug-preview")).toHaveText(
      new RegExp(`/mahsulotlar/${newSlug}$`),
    );
    const title = "Gialuron kislotali serum — chuqur namlantirish";
    const description =
      "Uch xil gialuron kislotali yengil serum terini chuqur namlaydi va tez so‘riladi. Asl mahsulot.";
    for (const [tab, t, d] of [
      ["O‘zbekcha", title, description],
      [
        "Русский",
        "Сыворотка с гиалуроновой кислотой",
        "Лёгкая сыворотка с тремя видами гиалуроновой кислоты глубоко увлажняет кожу.",
      ],
      [
        "English",
        "Hyaluronic acid serum, 30 ml",
        "A light serum with three hyaluronic acids that hydrates deep and absorbs fast.",
      ],
    ] as const) {
      await card.getByRole("tab", { name: new RegExp(tab) }).click();
      await card.getByLabel("SEO sarlavha").fill(t);
      await card.getByLabel("SEO tavsif").fill(d);
    }
    await card.getByRole("tab", { name: /O‘zbekcha/ }).click();
    await expect(card.getByText("Ideal uzunlik")).toHaveCount(2);
    await expect(card.getByTestId("seo-snippet")).toContainText(`${title} | Glow Derma`);
    await page
      .getByRole("tab", { name: /English/ })
      .first()
      .click();
    await enDescription.fill(
      "Three hyaluronic acids hydrate every layer of the skin; the light texture absorbs fast and leaves no film.",
    );
    await save(page);

    // Only hints were left: «Hammasi joyida», and it survives a reload.
    await expect(seoStatus(page).getByText("Hammasi joyida").first()).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Manzil (slug)")).toHaveValue(newSlug);
    await expect(seoCard(page).getByLabel("SEO sarlavha")).toHaveValue(title);
    await expect(seoStatus(page).locator('[data-code="seo_title_missing"]')).toHaveCount(0);
    await expect(seoStatus(page).getByText("Hammasi joyida").first()).toBeVisible();

    // Put everything back; the checklist lists the gaps again.
    await page.getByLabel("Manzil (slug)").fill(slugBefore);
    for (const tab of ["O‘zbekcha", "Русский", "English"]) {
      await seoCard(page)
        .getByRole("tab", { name: new RegExp(tab) })
        .click();
      await seoCard(page).getByLabel("SEO sarlavha").fill("");
      await seoCard(page).getByLabel("SEO tavsif").fill("");
    }
    await page
      .getByRole("tab", { name: /English/ })
      .first()
      .click();
    await page.locator('textarea[name="texts.en.description"]').fill(original.enDescription);
    await save(page);
    await expect(seoStatus(page).locator('[data-code="seo_title_missing"]')).toHaveCount(3);
    await expect(page.getByLabel("Manzil (slug)")).toHaveValue(slugBefore);
    original = null;
    watcher.assertClean();
  });

  test("a category's SEO title is saved and checked", async ({ page }) => {
    const watcher = watchPage(page);
    await page.goto("/admin/categories");
    await expect(heading(page)).toHaveText("Kategoriyalar");
    const row = page.locator("tr").filter({ hasText: "serums" });
    await row.getByRole("button", { name: /— tahrirlash$/ }).click();
    const dialog = page.getByRole("dialog", { name: "Kategoriyani tahrirlash" });
    await expect(dialog.getByTestId("seo-snippet")).toContainText("/kategoriyalar/serums");
    await dialog.getByRole("tab", { name: /Русский/ }).click();
    const title = dialog.getByLabel("SEO sarlavha");
    const before = await title.inputValue();
    categoryTouched = true;
    await title.fill("Сыв");
    await expect(dialog.getByText("Juda qisqa")).toBeVisible();
    await title.fill("Сыворотки для лица — Glow Derma");
    await expect(dialog.getByTestId("seo-snippet")).toContainText("/ru/categories/serums");
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(toast(page, "Kategoriya saqlandi")).toBeVisible();

    await page.reload();
    await row.getByRole("button", { name: /— tahrirlash$/ }).click();
    await dialog.getByRole("tab", { name: /Русский/ }).click();
    await expect(dialog.getByLabel("SEO sarlavha")).toHaveValue("Сыворотки для лица — Glow Derma");
    // The ru title no longer needs a hint; the uz one still does.
    const status = dialog.getByTestId("seo-status");
    await expect(
      status.getByText("SEO sarlavha (ruscha) yo‘q: sayt nomdan foydalanadi."),
    ).toHaveCount(0);
    await expect(
      status.getByText("SEO sarlavha (o‘zbekcha) yo‘q: sayt nomdan foydalanadi."),
    ).toBeVisible();

    await dialog.getByLabel("SEO sarlavha").fill(before);
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(toast(page, "Kategoriya saqlandi")).toBeVisible();
    categoryTouched = false;
    watcher.assertClean();
  });
});

test("a specialist shows its website address and checks a typed slug", async ({ page }) => {
  const watcher = watchPage(page);
  await page.goto("/admin/specialists/2");
  const slug = page.getByLabel("Manzil (slug)");
  const stored = await slug.inputValue();
  expect(stored).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  await expect(page.getByTestId("slug-preview")).toHaveText(
    new RegExp(`/mutaxassislar/${stored}$`),
  );
  await slug.fill("Dr Jasur");
  await expect(page.getByTestId("slug-preview")).toHaveText(/\/mutaxassislar\/dr%20jasur$/);
  // Upper case is lowered as typed; the space is refused before any save.
  await expect(
    page.getByText("Faqat lotin kichik harflari, raqamlar va chiziqcha (faqat raqam emas)."),
  ).toBeVisible();
  watcher.assertClean();
});

test("staff sign a customer's browser out from «Faol seanslar»", async ({ page, browser }) => {
  const watcher = watchPage(page);
  // A fresh customer signs up on the storefront: one web session.
  const customer = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const shop = await customer.newPage();
  const phone = randomPhone();
  try {
    await signUp(shop, phone, "E2E Seans");
    await shop.goto("/hisob");
    await expect(shop).toHaveURL(/\/hisob/);

    await page.goto(`/admin/customers?q=${phone}`);
    await page.getByRole("link", { name: "E2E Seans" }).first().click();
    await expect(heading(page)).toHaveText("E2E Seans");
    const section = page.getByRole("region", { name: "Faol seanslar", exact: true });
    const rows = section.locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Veb-sayt");

    await rows
      .first()
      .getByRole("button", { name: /^Seansni tugatish:/ })
      .click();
    const confirm = page.getByRole("alertdialog", { name: "Seansni tugatasizmi?" });
    await expect(confirm).toContainText("Amal sizning nomingizdan jurnalga yoziladi.");
    await confirm.getByRole("button", { name: "Seansni tugatish" }).click();
    await expect(toast(page, "Seans tugatildi")).toBeVisible();
    await expect(confirm).toBeHidden();
    await expect(section.getByText("Faol seans yo‘q")).toBeVisible();
    await page.reload();
    await expect(section.getByText("Faol seans yo‘q")).toBeVisible();

    // The storefront lost its session.
    await shop.goto("/hisob");
    await expect(shop).toHaveURL(/\/kirish/);

    // The audit log has the sign-out, by the staff member.
    await page.goto("/admin/audit-log?action=customer.session_revoked");
    const entry = page.locator("table tbody tr").first();
    await expect(entry).toContainText("Mijoz seansi tugatildi");
    await expect(entry).toContainText("Administrator");
  } finally {
    await customer.close();
  }
  watcher.assertClean();
});
