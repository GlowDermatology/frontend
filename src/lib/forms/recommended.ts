import { createElement, useState, type ReactNode } from "react";

import {
  RecommendedFieldsDialog,
  type RecommendedChoice,
  type RecommendedField,
} from "@/components/ui/form-errors";

import {
  recommendedMemoryKey,
  rememberSaveAnyway,
  sessionMemoryStore,
  wasAnsweredSaveAnyway,
  type RecommendedScope,
} from "./recommended-rules";

export type { RecommendedChoice, RecommendedField };
export * from "./recommended-rules";

export interface RecommendedConfirmOptions {
  /** Replaces the dialog's generic lead («…ma’lumot to‘liqroq bo‘ladi») for this form. */
  description?: string;
  /**
   * The saved entity the answer belongs to: «Baribir saqlash» is remembered for it and this exact
   * field set for the browser session (`recommendedMemoryKey`), so the same question is not asked
   * twice. Omit for a create (it has no id yet).
   */
  remember?: RecommendedScope | null;
}

/**
 * "Save anyway?" before saving a form with empty recommended (optional but valuable) fields.
 * Forms declare what they recommend in `src/domain` (`recommendedMissing(values)` →
 * `RecommendedField[]`), filter it with `recommendedToAsk` (only what is news: a create, a field
 * just cleared, a changed Uzbek source, the save that activates; never an inactive entity), then
 * ask:
 *
 * ```tsx
 * const { confirm, dialog } = useRecommendedConfirm();
 * const onValid = async (values) => {
 *   const missing = recommendedToAsk(recommendedMissing(values), { isNew, filledBefore, … });
 *   if ((await confirm(fields(missing), { remember: { kind: "product", id } })) === "fix") {
 *     return reveal({ name: missing[0]! });
 *   }
 *   save(values);
 * };
 * return <form …>{…}{dialog}</form>;
 * ```
 *
 * `confirm([])` (or a set already answered «Baribir saqlash» for `remember`) resolves `"save"` at
 * once without opening anything. Asking again while the dialog is open settles the earlier
 * question as `"fix"`.
 */
export function useRecommendedConfirm(): {
  confirm: (
    missing: ReadonlyArray<RecommendedField>,
    options?: RecommendedConfirmOptions,
  ) => Promise<RecommendedChoice>;
  dialog: ReactNode;
} {
  /* The list stays while the dialog animates out; `resolve` settles the open question. */
  const [state, setState] = useState<{
    open: boolean;
    missing: ReadonlyArray<RecommendedField>;
    description: string | undefined;
    resolve: ((choice: RecommendedChoice) => void) | null;
  }>({ open: false, missing: [], description: undefined, resolve: null });

  const confirm = (
    fields: ReadonlyArray<RecommendedField>,
    options?: RecommendedConfirmOptions,
  ) => {
    state.resolve?.("fix");
    const key =
      options?.remember && fields.length > 0
        ? recommendedMemoryKey(
            options.remember,
            fields.map((field) => field.name),
          )
        : null;
    const store = key ? sessionMemoryStore() : null;
    if (fields.length === 0 || (key && wasAnsweredSaveAnyway(store, key))) {
      if (state.resolve) setState((current) => ({ ...current, open: false, resolve: null }));
      return Promise.resolve<RecommendedChoice>("save");
    }
    return new Promise<RecommendedChoice>((resolve) => {
      setState({
        open: true,
        missing: fields,
        description: options?.description,
        resolve: (choice) => {
          if (choice === "save" && key) rememberSaveAnyway(store, key);
          resolve(choice);
        },
      });
    });
  };

  const onChoose = (choice: RecommendedChoice) => {
    state.resolve?.(choice);
    setState((current) => ({ ...current, open: false, resolve: null }));
  };

  const dialog = createElement(RecommendedFieldsDialog, {
    open: state.open,
    missing: state.missing,
    description: state.description,
    onChoose,
  });

  return { confirm, dialog };
}
