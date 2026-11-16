import type { IssueAlert } from "@/domain/delivery-issue";
import { issueKindLabel } from "@/domain/order";

/**
 * Which urgent delivery issues get a toast (Yandex Delivery plan §4): every
 * urgent issue that appears while staff work, exactly once per browser.
 * Pure (storage is injected), unit-tested.
 *
 * The ids already announced live in `localStorage` (shared by the tabs, so
 * two tabs do not both toast, and surviving navigations and reloads); when
 * storage is unavailable (private mode, blocked, quota, a value that does not
 * parse) an in-memory set takes over for the life of the page. The very
 * first look in a browser records the issues open then without a toast:
 * the badge shows that backlog, the toasts announce what is new.
 */

export const SEEN_STORAGE_KEY = "gd_admin_urgent_issues_seen";
/** Kept ids (most recent last); issue ids are never reused, so old ones only cost space. */
export const MAX_SEEN = 200;
/** The toast region shows three at a time. */
export const MAX_TOASTS_PER_POLL = 3;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface SeenStore {
  /** The announced ids, or `null` before the first look in this browser. */
  load(): number[] | null;
  save(ids: ReadonlyArray<number>): void;
}

const isId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

/** Parses the stored value; anything but `{v: 1, ids: number[]}` reads as "never looked". */
export function parseSeen(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== "object" || value === null) return null;
    const { v, ids } = value as { v?: unknown; ids?: unknown };
    if (v !== 1 || !Array.isArray(ids)) return null;
    return ids.filter(isId).slice(-MAX_SEEN);
  } catch {
    return null;
  }
}

/**
 * A store over `storage` that never throws: a failing read or write switches
 * it to memory (the value written last is kept there).
 */
export function createSeenStore(storage: StorageLike | null): SeenStore {
  let memory: number[] | null = null;
  let usable = storage !== null;
  return {
    load() {
      if (usable && storage) {
        try {
          const stored = parseSeen(storage.getItem(SEEN_STORAGE_KEY));
          // Memory may know more (a write that failed after this read worked).
          return stored ?? memory;
        } catch {
          usable = false;
        }
      }
      return memory;
    },
    save(ids) {
      memory = ids.slice(-MAX_SEEN);
      if (!usable || !storage) return;
      try {
        storage.setItem(SEEN_STORAGE_KEY, JSON.stringify({ v: 1, ids: memory }));
      } catch {
        usable = false;
      }
    },
  };
}

/** The browser's store: `localStorage` when it can be touched at all, else memory only. */
export function browserSeenStore(): SeenStore {
  let storage: StorageLike | null = null;
  try {
    storage = typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    storage = null;
  }
  return createSeenStore(storage);
}

export interface Announcement {
  /** Newly seen urgent issues, in the API's order. */
  fresh: IssueAlert[];
  /** What to store: the previous ids plus the fresh ones, capped. */
  seen: number[];
}

/**
 * The urgent issues to announce: those not seen before. `seen === null` (the
 * first look) announces nothing and records the current ones.
 */
export function announce(
  seen: ReadonlyArray<number> | null,
  urgent: ReadonlyArray<IssueAlert>,
): Announcement {
  if (seen === null) {
    return { fresh: [], seen: urgent.map((alert) => alert.id).slice(-MAX_SEEN) };
  }
  const known = new Set(seen);
  const fresh: IssueAlert[] = [];
  for (const alert of urgent) {
    if (known.has(alert.id)) continue;
    known.add(alert.id);
    fresh.push(alert);
  }
  return {
    fresh,
    seen: fresh.length === 0 ? [...seen] : [...seen, ...fresh.map((a) => a.id)].slice(-MAX_SEEN),
  };
}

export interface AlertToast {
  title: string;
  description: string;
}

/** "Shoshilinch: buyurtma №10233" · "Qaytish kutilmoqda · warehouse_closed". */
export function alertToast(alert: IssueAlert): AlertToast {
  return {
    title: `Shoshilinch: buyurtma №${alert.orderId}`,
    description: `${issueKindLabel(alert.kind)} · ${alert.code}. «Muammolar» bo‘limida ko‘ring.`,
  };
}

/**
 * The toasts of one poll: one per fresh issue, or — beyond the three the
 * region shows — the first two and a summary of the rest.
 */
export function planToasts(fresh: ReadonlyArray<IssueAlert>): AlertToast[] {
  if (fresh.length <= MAX_TOASTS_PER_POLL) return fresh.map(alertToast);
  const shown = fresh.slice(0, MAX_TOASTS_PER_POLL - 1).map(alertToast);
  const rest = fresh.length - shown.length;
  return [
    ...shown,
    {
      title: `Yana ${rest} ta shoshilinch muammo`,
      description: "«Muammolar» bo‘limida ko‘ring.",
    },
  ];
}
