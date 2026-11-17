import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";

/* Helpers of the catalog forms' error reveal (product editor, category and banner dialogs). */

/**
 * The content language a set of failing paths should show first: the current tab when it holds
 * an error, else the first language (uz, ru, en) that does; `null` when no `prefix.<lang>.…` path
 * failed.
 */
export function languageToShow(
  names: ReadonlyArray<string>,
  prefix: "texts" | "seo",
  current: ContentLanguage,
): ContentLanguage | null {
  const failing = new Set(
    names
      .filter((name) => name.startsWith(`${prefix}.`))
      .map((name) => name.split(".")[1] as ContentLanguage),
  );
  if (failing.size === 0) return null;
  if (failing.has(current)) return current;
  return CONTENT_LANGUAGES.find((language) => failing.has(language)) ?? null;
}

/**
 * Resolves once no alert dialog is on screen any more (its close animation done and its focus
 * handed back), at most ~0.6 s. The "save anyway?" dialog returns focus to the submit button when
 * it unmounts; revealing a field before that would lose the focus again. Shared by the catalog
 * forms (product editor, category and banner dialogs).
 */
export function afterDialogsClose(root: Pick<Document, "querySelector"> = document): Promise<void> {
  return new Promise((resolve) => {
    let frames = 0;
    const check = () => {
      frames += 1;
      if (!root.querySelector('[role="alertdialog"]') || frames > 36) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}
