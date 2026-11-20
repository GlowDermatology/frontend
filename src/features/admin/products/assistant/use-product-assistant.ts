"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";

import { useToast } from "@/components/ui/toast";
import { acceptAssistantJob, pollAssistantJob, startAssistantJob } from "@/data/assistant.actions";
import type { ProductFormValues } from "@/data/products.schema";
import {
  buildDraft,
  formPathOf,
  isAssistantJobActive,
  isAwaitingReview,
  isPlaceholder,
  type AssistantDraft,
  type AssistantJob,
  type AssistantJobNotes,
  type AssistantStartInput,
  type AssistantStatus,
  type SuggestionWarning,
} from "@/domain/assistant";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../../shared/action-client";
import { useIdempotencyKey } from "../../shared/idempotency";
import { createImportController, type ImportController } from "../import-controller";
import { assistantCopy } from "./copy";
import {
  fieldRequest,
  forgetJob,
  menuRequest,
  problemsOf,
  rememberedJob,
  rememberJob,
  type KeyProblem,
  type MenuAction,
} from "./review";

/** A field the AI wrote into the form: what was there before, for «Undo». */
export interface AiChange {
  previous: string;
  suggested: string;
  warnings: SuggestionWarning[];
}

/** The banner at the top of the editor after a menu command (or a start without a job). */
export type AssistantBanner =
  | {
      kind: "filled";
      count: number;
      problems: Array<{ key: string; problem: KeyProblem }>;
      /** The brand and volume read from the packaging (shown, never written). */
      extracted: AssistantJobNotes["extracted"];
    }
  | {
      kind: "nothing";
      problems: Array<{ key: string; problem: KeyProblem }>;
      extracted: AssistantJobNotes["extracted"];
    }
  | { kind: "nothingToFill" };

/** What a click asked for: one field's ✨ (its note answers) or a menu command (the banner). */
type Target = { source: "field"; key: string } | { source: "menu"; action: MenuAction };

/** The running job's request. */
interface Request {
  input: AssistantStartInput;
  target: Target;
  /** The form's values when it started (an edit made meanwhile is not overwritten). */
  sent: AssistantDraft | null;
}

type Path = Parameters<UseFormSetValue<ProductFormValues>>[0];

interface Options {
  /** The saved product's id; `null` (a new product) hides the assistant. */
  productId: string | null;
  status: AssistantStatus | undefined;
  /** Photos the server knows (alt keys and the photo command use only these). */
  savedImageIds: ReadonlyArray<string>;
  getValues: UseFormGetValues<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
}

export interface ProductAssistant {
  /** Shown at all: switched on and the product is saved. */
  enabled: boolean;
  /** A job is starting or running. */
  running: boolean;
  /** The keys a running ✨ (one field) is writing: their buttons spin. */
  fieldKeys: ReadonlyArray<string>;
  changes: Readonly<Record<string, AiChange>>;
  /** Per field: why its ✨ produced no text. */
  problems: Readonly<Record<string, KeyProblem>>;
  banner: AssistantBanner | null;
  savedImageIds: ReadonlyArray<string>;
  maxImages: number;
  /** The form's current values per key (built at call time). */
  draft: () => AssistantDraft;
  runField: (key: string) => void;
  runMenu: (action: MenuAction) => void;
  /** Writes a suggestion held for review (a `review` problem) into its field. */
  insertSuggestion: (key: string) => void;
  undo: (key: string) => void;
  undoAll: () => void;
  dismissBanner: () => void;
  /** After a save: the AI texts are now ordinary saved text. */
  clear: () => void;
}

/**
 * The editor's AI assistant: starts a job with the form's current values, polls it (the job
 * survives the hidden route and, by its id in sessionStorage, a reload), writes the suggestions
 * straight into the form fields (dirty, validated) and accepts them, so the admin reviews the text
 * in place and saves the product as usual.
 */
export function useProductAssistant({
  productId,
  status,
  savedImageIds,
  getValues,
  setValue,
}: Options): ProductAssistant {
  const t = useCopy(assistantCopy);
  const toast = useToast();
  const startKey = useIdempotencyKey();
  const [job, setJob] = useState<AssistantJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [request, setRequest] = useState<Request | null>(null);
  const [changes, setChanges] = useState<Record<string, AiChange>>({});
  const [problems, setProblems] = useState<Record<string, KeyProblem>>({});
  const [banner, setBanner] = useState<AssistantBanner | null>(null);
  const enabled = Boolean(status?.enabled) && productId !== null;

  const draft = () => buildDraft(getValues(), savedImageIds);

  /**
   * Puts a value into the form field of `path`, dirty and validated. The SEO texts are one
   * controlled field (`seo`): it is set whole, so its editor sees the change.
   */
  const write = (path: Path, value: string) => {
    const options = { shouldDirty: true, shouldValidate: true };
    const [head, language, leaf] = path.split(".");
    if (head === "seo" && (language === "uz" || language === "ru" || language === "en")) {
      const seo = getValues("seo");
      setValue("seo", { ...seo, [language]: { ...seo[language], [leaf!]: value } }, options);
    } else setValue(path, value, options);
  };

  /** Writes `suggested` into the field of `key`, keeping what was there for «Undo». */
  const put = (
    key: string,
    path: Path,
    suggested: string,
    warnings: SuggestionWarning[],
    into: Record<string, AiChange>,
  ) => {
    const previous = into[key]?.previous ?? String(getValues(path) ?? "");
    write(path, suggested);
    into[key] = { previous, suggested, warnings };
  };

  /**
   * Writes a finished job's suggestions into the form, accepts them, reports the rest. An unchecked
   * suggestion (read from the photos, or with an unverified claim or number) is written only into
   * an empty or placeholder field; over the admin's text it waits in the field's note for «Insert».
   */
  const insert = (finished: AssistantJob) => {
    const { request, changes } = latest.current;
    if (productId) forgetJob(productId);
    const result = finished.result;
    const sent = request?.sent ?? null;
    const images = getValues("images");
    const nextChanges = { ...changes };
    const keyProblems = problemsOf(result?.notes);
    const inserted: string[] = [];
    for (const suggestion of result?.suggestions ?? []) {
      const path = formPathOf(suggestion.key, images) as Path | null;
      if (!path) continue;
      const now = String(getValues(path) ?? "");
      if (sent && suggestion.key in sent && now.trim() !== sent[suggestion.key]!.trim()) {
        keyProblems[suggestion.key] = { kind: "edited" };
        continue;
      }
      // Over an AI text not saved yet, the admin's own text is the one from before it.
      const own = changes[suggestion.key]?.previous ?? now;
      if (!suggestion.checked && !isPlaceholder(own)) {
        keyProblems[suggestion.key] = {
          kind: "review",
          suggested: suggestion.suggested,
          warnings: suggestion.warnings,
        };
        continue;
      }
      put(suggestion.key, path, suggestion.suggested, suggestion.warnings, nextChanges);
      inserted.push(suggestion.key);
    }
    // A requested key that came back with neither a text nor a note: say so, never stay silent.
    const requested = finished.keys.length > 0 ? finished.keys : (request?.input.keys ?? []);
    for (const key of requested) {
      if (!inserted.includes(key)) keyProblems[key] ??= { kind: "fallback" };
    }
    setChanges(nextChanges);
    setProblems((current) => ({ ...current, ...keyProblems }));
    if (request?.target.source === "menu") {
      const listed = Object.entries(keyProblems).map(([key, problem]) => ({ key, problem }));
      const extracted = result?.notes.extracted ?? null;
      setBanner(
        inserted.length > 0
          ? { kind: "filled", count: inserted.length, problems: listed, extracted }
          : { kind: "nothing", problems: listed, extracted },
      );
    }
    // The form already holds the text: a failed accept only leaves the job open (logged).
    void runAction((csrf) => acceptAssistantJob(finished.id, inserted, csrf)).then((accepted) => {
      if (!accepted.ok) console.warn("[assistant] accept failed", accepted.error);
    });
  };

  /** The request of `target` from the form's current values. */
  const requestFor = (target: Target): Request => {
    const sent = draft();
    if (target.source === "menu") {
      const input = menuRequest(target.action, sent, savedImageIds, status?.maxImages ?? 0);
      return { input, target, sent };
    }
    // «Another version» of an AI text asks again from what was there before the AI.
    const previous = changes[target.key]?.previous;
    const base = previous === undefined ? sent : { ...sent, [target.key]: previous };
    return { input: fieldRequest(base, target.key), target, sent };
  };

  const fail = (message: string | undefined) => {
    const { request } = latest.current;
    toast({
      tone: "danger",
      title: t.toast.failed,
      description: message,
      // A retry asks again from the form as it is now, not as it was at the first click.
      ...(request
        ? {
            action: {
              label: t.toast.retry,
              onClick: () => {
                const { start, requestFor } = latest.current;
                void start(requestFor(request.target));
              },
            },
          }
        : {}),
    });
  };

  // What the controller's callbacks call (they outlive renders): this render's functions.
  const latest = useRef({ t, productId, request, changes, insert, fail, start, requestFor });
  useEffect(() => {
    latest.current = { t, productId, request, changes, insert, fail, start, requestFor };
  });

  const controllerRef = useRef<ImportController<AssistantJob> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    controllerRef.current ??= createImportController<AssistantJob>({
      fetchJob: (id) => runAction((csrf) => pollAssistantJob(id, csrf)),
      timeoutMessage: () => latest.current.t.toast.failed,
      onUpdate: (next) => {
        setJob(next);
        if (isAssistantJobActive(next)) return;
        if (isAwaitingReview(next)) latest.current.insert(next);
        else {
          const { productId } = latest.current;
          if (productId) forgetJob(productId);
          if (next.state === "failed") latest.current.fail(next.error?.message);
        }
        setJob(null);
      },
      onRetry: () => undefined,
      onError: (message) => {
        setJob(null);
        const { productId } = latest.current;
        if (productId) forgetJob(productId);
        latest.current.fail(message);
      },
    });
    const controller = controllerRef.current;
    controller.attach();
    // A job started before a reload: resume it once (a finished one is inserted as it is).
    const id = latest.current.productId;
    const remembered = id ? rememberedJob(id) : null;
    if (id && remembered && !controller.job) {
      void runAction((csrf) => pollAssistantJob(remembered, csrf)).then((result) => {
        if (controller.job) return;
        if (result.ok && (isAssistantJobActive(result.data) || isAwaitingReview(result.data))) {
          controller.start(result.data);
        } else forgetJob(id);
      });
    }
    return () => controller.detach();
  }, [enabled]);

  const running = starting || (job !== null && isAssistantJobActive(job));

  async function start(next: Request) {
    if (!productId || starting || running) return;
    setStarting(true);
    setRequest(next);
    latest.current = { ...latest.current, request: next };
    setBanner(null);
    setProblems((current) => {
      const rest = { ...current };
      for (const key of next.input.keys) delete rest[key];
      return rest;
    });
    const result = startKey.settle(
      await runAction((csrf) => startAssistantJob(productId, next.input, startKey.key, csrf)),
    );
    setStarting(false);
    if (!result.ok) {
      fail(result.error);
      return;
    }
    if (result.data.nothingToFill) {
      if (next.target.source === "menu") setBanner({ kind: "nothingToFill" });
      else {
        setProblems((current) => ({
          ...current,
          ...Object.fromEntries(
            next.input.keys.map((key) => [key, { kind: "nothingToDo" } as const]),
          ),
        }));
      }
      return;
    }
    rememberJob(productId, result.data.job.id);
    controllerRef.current?.start(result.data.job);
  }

  const restore = (keys: ReadonlyArray<string>) => {
    const images = getValues("images");
    const rest = { ...changes };
    for (const key of keys) {
      const change = changes[key];
      const path = formPathOf(key, images) as Path | null;
      if (change && path) {
        write(path, change.previous);
      }
      delete rest[key];
    }
    setChanges(rest);
  };

  return {
    enabled,
    running,
    fieldKeys: running && request?.target.source === "field" ? request.input.keys : [],
    changes,
    problems,
    banner,
    savedImageIds,
    maxImages: status?.maxImages ?? 0,
    draft,
    runField: (key) => void start(requestFor({ source: "field", key })),
    runMenu: (action) => void start(requestFor({ source: "menu", action })),
    insertSuggestion: (key) => {
      const problem = problems[key];
      const path = formPathOf(key, getValues("images")) as Path | null;
      if (problem?.kind !== "review" || problem.suggested === undefined || !path) return;
      const nextChanges = { ...changes };
      put(key, path, problem.suggested, problem.warnings ?? [], nextChanges);
      setChanges(nextChanges);
      setProblems((current) => {
        const rest = { ...current };
        delete rest[key];
        return rest;
      });
    },
    undo: (key) => restore([key]),
    undoAll: () => {
      restore(Object.keys(changes));
      setBanner(null);
    },
    dismissBanner: () => setBanner(null),
    clear: () => {
      setChanges({});
      setProblems({});
      setBanner(null);
    },
  };
}
