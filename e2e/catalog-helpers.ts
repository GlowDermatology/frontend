import { expect, type Locator, type Page } from "@playwright/test";

import { kitCopy } from "../src/components/ui/copy";

/**
 * The admin forms (product editor, category and banner dialogs, the notification composer) ask
 * "save anyway?" when a recommended field is empty (photos, translations, SEO texts, a deep link;
 * `RecommendedFieldsDialog`). The specs do not depend on which recommended fields the seed fills
 * in: after a click on «Saqlash» this waits for either the question or `next` (the success toast,
 * a field error), and answers «Baribir saqlash» when the question came.
 */
export async function saveAnyway(page: Page, next: Locator): Promise<void> {
  const question = page.getByRole("alertdialog", { name: kitCopy.uz.recommended.title });
  await expect(question.or(next).first()).toBeVisible();
  if (await question.isVisible()) {
    await question.getByRole("button", { name: kitCopy.uz.recommended.save }).click();
    await expect(question).toBeHidden();
  }
}
