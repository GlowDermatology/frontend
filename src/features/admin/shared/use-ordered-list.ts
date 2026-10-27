"use client";

import { useState } from "react";

import type { ActionResult } from "@/data/types";
import { moveItem } from "@/domain/category";

import { createOrderSync } from "./order-sync";

/**
 * Local state of an ordered admin list (Kategoriyalar, Bannerlar): the
 * server's rows, optimistic moves sent through `createOrderSync`, and rows
 * changed by the dialogs (`apply`). A newer server list (a route refresh
 * after a mutation, or a client navigation back to the kept-mounted route)
 * replaces the local copy, so another admin's renames and the product counts
 * are never stale. `announcement` is the polite live-region text of the last
 * move.
 */

export interface OrderedListOptions<T> {
  keyOf: (item: T) => string;
  /** Accessible name of a row, e.g. "«Serumlar»". */
  label: (item: T) => string;
  send: (keys: string[]) => Promise<ActionResult<T[]>>;
  onError: (message: string) => void;
  /** Combines the server's answer with the local rows (e.g. keep demo previews). */
  merge?: (server: T[], local: T[]) => T[];
}

interface ListState<T> {
  items: T[];
  /** The last order the server confirmed (the rollback target). */
  confirmed: T[];
}

export function useOrderedList<T>(server: T[], options: OrderedListOptions<T>) {
  const [source, setSource] = useState(server);
  const [list, setList] = useState<ListState<T>>({ items: server, confirmed: server });
  if (server !== source) {
    setSource(server);
    setList({ items: server, confirmed: server });
  }
  const [announcement, setAnnouncement] = useState("");
  const [sync] = useState(() =>
    createOrderSync<T>({
      send: options.send,
      onConfirmed: (rows) =>
        setList((current) => {
          const merged = options.merge ? options.merge(rows, current.items) : rows;
          return { items: merged, confirmed: merged };
        }),
      onFailed: (message) => {
        setList((current) => ({ items: current.confirmed, confirmed: current.confirmed }));
        setAnnouncement("");
        options.onError(message);
      },
    }),
  );

  const move = (from: number, to: number): boolean => {
    const next = moveItem(list.items, from, to);
    const moved = next[to];
    if (from === to || moved === undefined) return false;
    setList((current) => ({ ...current, items: next }));
    sync.push(next.map(options.keyOf));
    setAnnouncement(`${options.label(moved)} ${to + 1}-o‘ringa ko‘chirildi.`);
    return true;
  };

  /** A server-confirmed change from a dialog (create, edit, delete). */
  const apply = (change: (rows: T[]) => T[]) =>
    setList((current) => ({ items: change(current.items), confirmed: change(current.confirmed) }));

  return { items: list.items, move, apply, announcement };
}

/** Inserts `row`, or replaces the row with the same key (a repeated create never duplicates). */
export function upsertRow<T>(rows: T[], row: T, keyOf: (item: T) => string): T[] {
  const key = keyOf(row);
  return rows.some((item) => keyOf(item) === key)
    ? rows.map((item) => (keyOf(item) === key ? row : item))
    : [...rows, row];
}
