import type { IssueAlerts } from "@/domain/delivery-issue";

import {
  announce,
  browserSeenStore,
  planToasts,
  type AlertTexts,
  type AlertToast,
  type SeenStore,
} from "./issue-alerts";
import { fetchIssueAlerts, POLL_INTERVAL_MS, startIssuePoll, type PollEnv } from "./issue-poll";

/**
 * The page-wide state of the delivery issue badge (client only): one poll
 * for the whole panel, however many islands show the count (the header
 * button, the desktop sidebar, the mobile drawer). The module outlives
 * client navigations, so the 30 s rhythm survives them too: a page mounted
 * 10 s after the last poll waits the remaining 20 s.
 */

export interface IssueSnapshot {
  /** Open issues; `null` until the first poll (the islands show the server's count). */
  open: number | null;
  /** Open urgent issues (the badge turns red). */
  urgent: number;
}

const EMPTY: IssueSnapshot = { open: null, urgent: 0 };

let snapshot: IssueSnapshot = EMPTY;
let lastPollAt: number | null = null;
let stopPoll: (() => void) | null = null;
let attached = 0;
let toaster: ((toast: AlertToast) => void) | null = null;
let toastTexts: AlertTexts | undefined;
let toastKindLabel: ((kind: string) => string) | undefined;
let seenStore: SeenStore | null = null;
const listeners = new Set<() => void>();

function publish(next: IssueSnapshot) {
  if (next.open === snapshot.open && next.urgent === snapshot.urgent) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): IssueSnapshot {
  return snapshot;
}

export function getServerSnapshot(): IssueSnapshot {
  return EMPTY;
}

/**
 * A count the server rendered (a navigation, or the refresh after resolving
 * an issue): newer than the last poll's, so it is shown until the next one.
 */
export function offerServerCount(open: number | null) {
  if (open === null || snapshot.open === null || open === snapshot.open) return;
  publish({ open, urgent: snapshot.urgent });
}

/** Applies one poll answer: the counts, then a toast per new urgent issue. */
export function receive(
  alerts: IssueAlerts,
  store: SeenStore,
  toast: ((t: AlertToast) => void) | null,
  texts?: AlertTexts,
  kindLabel?: (kind: string) => string,
) {
  publish({ open: alerts.open, urgent: alerts.urgent.length });
  const { fresh, seen } = announce(store.load(), alerts.urgent);
  store.save(seen);
  if (toast) for (const item of planToasts(fresh, texts, kindLabel)) toast(item);
}

function browserEnv(): PollEnv {
  return {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
    now: () => Date.now(),
    hidden: () => document.visibilityState === "hidden",
    onVisible: (fn) => {
      const listener = () => {
        if (document.visibilityState === "visible") fn();
      };
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
  };
}

/**
 * Attaches an island that can toast (the header button): the first one
 * starts the poll, the last one to leave stops it. Returns the detach.
 * `texts` are the toasts' words in the admin language (Uzbek by default), `kindLabel` names an
 * issue kind in it.
 */
export function attach(
  toast: (toast: AlertToast) => void,
  texts?: AlertTexts,
  kindLabel?: (kind: string) => string,
): () => void {
  attached += 1;
  toaster = toast;
  toastTexts = texts;
  toastKindLabel = kindLabel;
  if (!stopPoll) {
    seenStore ??= browserSeenStore();
    const env = browserEnv();
    const since = lastPollAt === null ? POLL_INTERVAL_MS : env.now() - lastPollAt;
    stopPoll = startIssuePoll({
      env,
      firstDelayMs: Math.max(0, POLL_INTERVAL_MS - since),
      load: async () => {
        lastPollAt = env.now();
        return fetchIssueAlerts();
      },
      onAlerts: (alerts) => receive(alerts, seenStore!, toaster, toastTexts, toastKindLabel),
      onExpired: () => {
        stopPoll = null;
      },
    });
  }
  return () => {
    attached -= 1;
    if (attached > 0) return;
    toaster = null;
    stopPoll?.();
    stopPoll = null;
  };
}
