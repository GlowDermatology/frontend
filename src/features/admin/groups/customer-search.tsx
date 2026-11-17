"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  CUSTOMER_LOOKUP_LIMIT,
  lookupTerm,
  type CustomerLookupItem,
  type CustomerLookupResult,
} from "@/domain/customer-lookup";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import {
  initials,
  maskSearchInput,
  readLookupResult,
  SEARCH_FIELD,
  unavailableReason,
} from "./add-members";
import { groupsCopy } from "./copy";

/** Pause after the last keystroke before asking the server (DESIGN §C). */
export const LOOKUP_DEBOUNCE_MS = 250;

type LookupStatus = "idle" | "short" | "loading" | "done" | "error" | "expired";

interface LookupState {
  /** `kind:term` the state answers. */
  key: string;
  status: "loading" | "done" | "error" | "expired";
  result: CustomerLookupResult | null;
}

/**
 * The lookup behind the search field: debounced by 250 ms, each new term aborts the previous
 * request; the last answer stays on screen (dimmed) while the next one loads.
 */
function useCustomerLookup(query: string, segmentId: string, attempt: number) {
  const searched = lookupTerm(query);
  const term = searched?.term ?? "";
  const key = searched ? `${searched.kind}:${term}` : "";
  const [state, setState] = useState<LookupState | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState((current) => ({ key, status: "loading", result: current?.result ?? null }));
      try {
        const params = new URLSearchParams({ q: term, segment: segmentId });
        const response = await fetch(`/admin/customers/lookup?${params}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (response.status === 401) {
          setState({ key, status: "expired", result: null });
          return;
        }
        const result = response.ok ? readLookupResult(await response.json()) : null;
        setState(result ? { key, status: "done", result } : { key, status: "error", result: null });
      } catch {
        if (!controller.signal.aborted) setState({ key, status: "error", result: null });
      }
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [key, term, segmentId, attempt]);

  let status: LookupStatus;
  if (!key) status = query.trim() ? "short" : "idle";
  else if (!state || state.key !== key) status = "loading";
  else status = state.status;
  const items = state?.result?.items ?? [];
  return { status, items: status === "short" || status === "idle" ? [] : items, term };
}

/**
 * The add-members dialog's primary control (DESIGN §C): an async combobox that finds customers
 * by name or phone (digits are masked like the phone input, "+998" shown in front) and toggles
 * them in the picks list. WAI-ARIA combobox with an inline multi-select listbox: ↑ ↓ move,
 * Enter picks or drops, the input keeps focus. Already-members and deleted customers stay in the
 * list, announced as unavailable with the reason.
 */
export function CustomerSearch({
  segmentId,
  picks,
  onToggle,
  errorId,
}: {
  segmentId: string;
  picks: ReadonlyArray<CustomerLookupItem>;
  onToggle: (item: CustomerLookupItem) => void;
  /** Set while the list-level error (nothing picked, too many) points at the search. */
  errorId?: string;
}) {
  const t = useCopy(groupsCopy).add;
  const fmt = useFormat();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Whether a pointer is pressed anywhere: the results are inline, so closing them on the
  // press (the input's blur) would move everything below before the release, and the click
  // («ID yoki telefonlar ro‘yxatini joylashtirish», «Bekor qilish») would land elsewhere.
  const pointerHeld = useRef(false);
  useEffect(() => {
    const down = () => {
      pointerHeld.current = true;
    };
    const up = () => {
      pointerHeld.current = false;
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
    };
  }, []);
  const closeOnBlur = () => {
    if (!pointerHeld.current) {
      setOpen(false);
      return;
    }
    // Close once the press is released and its click has run (unless the input has the focus
    // back by then).
    const close = () => {
      window.removeEventListener("pointerup", close, true);
      window.removeEventListener("pointercancel", close, true);
      window.setTimeout(() => {
        if (document.activeElement !== inputRef.current) setOpen(false);
      }, 0);
    };
    window.addEventListener("pointerup", close, true);
    window.addEventListener("pointercancel", close, true);
  };
  const [value, setValue] = useState("");
  const [prefix, setPrefix] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const [announce, setAnnounce] = useState("");
  const lookup = useCustomerLookup(value, segmentId, attempt);
  const items = lookup.items;
  const picked = new Set(picks.map((pick) => pick.id));

  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const showList = open && lookup.status !== "idle";
  const current = active >= 0 && active < items.length ? active : -1;

  const choose = (item: CustomerLookupItem) => {
    const reason = unavailableReason(item, t);
    if (reason) {
      setAnnounce(reason);
      return;
    }
    const name = item.name || t.deletedCustomer;
    setAnnounce(picked.has(item.id) ? t.unpickedAnnounce(name) : t.pickedAnnounce(name));
    onToggle(item);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (items.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => {
        const from = index >= 0 && index < items.length ? index : step > 0 ? -1 : items.length;
        return (from + step + items.length) % items.length;
      });
    } else if (event.key === "Enter") {
      // Enter never submits the dialog from here: it picks the highlighted customer.
      event.preventDefault();
      if (current >= 0) choose(items[current]!);
      else if (items.length > 0) setActive(0);
    } else if (event.key === "Home" && event.altKey && items.length > 0) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && event.altKey && items.length > 0) {
      event.preventDefault();
      setActive(items.length - 1);
    }
  };

  const statusText =
    lookup.status === "loading"
      ? t.searching
      : lookup.status === "short"
        ? t.typeMore
        : lookup.status === "error"
          ? t.searchFailed
          : lookup.status === "expired"
            ? t.sessionExpired
            : lookup.status === "done"
              ? items.length > 0
                ? t.found(items.length)
                : t.noResults(value.trim())
              : "";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className="text-label text-ink">
        {t.searchLabel}
      </label>
      <div
        data-reveal-box
        className={cn(
          "group/search shadow-xs flex h-12 items-center gap-2 rounded-md border-[1.5px] border-line-strong bg-surface-raised pr-1.5 pl-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-gold-ink focus-within:shadow-[0_0_0_4px_var(--color-gold-soft)] motion-reduce:transition-none",
          errorId && "border-danger focus-within:border-danger",
        )}
      >
        <Icon name="search" size={18} className="shrink-0 text-ink-muted" />
        {prefix && (
          <span aria-hidden className="shrink-0 text-body text-ink-muted tabular-nums">
            {t.phonePrefix}
          </span>
        )}
        <input
          ref={inputRef}
          id={`${id}-input`}
          data-field={SEARCH_FIELD}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && current >= 0 ? optionId(current) : undefined}
          aria-describedby={cn(errorId, hintId) || undefined}
          aria-invalid={errorId ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={t.searchPlaceholder}
          value={value}
          maxLength={64}
          onChange={(event) => {
            const input = event.currentTarget;
            const masked = maskSearchInput(input.value, input.selectionStart ?? input.value.length);
            setValue(masked.text);
            setPrefix(masked.prefix);
            setOpen(true);
            setActive(-1);
            if (masked.text !== input.value) {
              window.requestAnimationFrame(() =>
                inputRef.current?.setSelectionRange(masked.caret, masked.caret),
              );
            }
          }}
          onFocus={() => setOpen(true)}
          onBlur={closeOnBlur}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-ink tabular-nums placeholder:text-ink-muted focus-visible:outline-none"
        />
        {lookup.status === "loading" && (
          <span
            aria-hidden
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-gold/30 border-t-gold-ink motion-reduce:animate-none"
          />
        )}
        {value && (
          <IconButton
            size="sm"
            aria-label={t.clearSearch}
            className="size-9"
            onClick={() => {
              setValue("");
              setPrefix(false);
              setActive(-1);
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" size={16} />
          </IconButton>
        )}
      </div>
      <p id={hintId} className="m-0 text-caption font-normal text-ink-muted">
        {t.searchHint}
      </p>

      {/* Results: inline (not a popover), so the dialog's scroll and focus trap stay simple. */}
      <div
        hidden={!showList}
        className={cn(
          "shadow-md overflow-hidden rounded-md border border-line bg-surface-raised",
          showList && "animate-fade-in",
        )}
      >
        {lookup.status !== "done" || items.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-body-sm text-ink-muted">
            <span className="flex items-center gap-2">
              <Icon
                name={
                  lookup.status === "error" || lookup.status === "expired"
                    ? "alert-circle"
                    : lookup.status === "loading"
                      ? "search"
                      : "info"
                }
                size={16}
                className={cn(
                  "shrink-0",
                  lookup.status === "error" || lookup.status === "expired"
                    ? "text-danger"
                    : "text-gold-ink",
                )}
              />
              {statusText}
            </span>
            {lookup.status === "error" && (
              <Button
                size="sm"
                variant="ghost"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setAttempt((n) => n + 1)}
              >
                <Icon name="refresh" size={16} />
                {t.retry}
              </Button>
            )}
          </div>
        ) : null}
        <ul
          id={listId}
          role="listbox"
          aria-label={t.resultsLabel}
          aria-multiselectable
          aria-busy={lookup.status === "loading" || undefined}
          className={cn(
            "scroll-slim m-0 flex max-h-[288px] list-none flex-col overflow-y-auto p-1.5 transition-opacity duration-150 motion-reduce:transition-none",
            items.length === 0 && "hidden",
            lookup.status === "loading" && "opacity-60",
          )}
        >
          {items.map((item, index) => {
            const reason = unavailableReason(item, t);
            const isPicked = picked.has(item.id);
            const reasonId = `${optionId(index)}-reason`;
            const name = item.name || t.deletedCustomer;
            const contact = item.phone ? fmt.phone(item.phone) : (item.email ?? "");
            return (
              <li
                key={item.id}
                id={optionId(index)}
                role="option"
                aria-selected={isPicked}
                aria-disabled={reason ? true : undefined}
                aria-describedby={reason ? reasonId : undefined}
                data-active={index === current ? "" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-sm px-2.5 py-2 transition-colors duration-100 data-active:bg-gold-soft motion-reduce:transition-none",
                  reason && "cursor-not-allowed",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    reason ? "bg-surface text-ink-muted" : "bg-gold-soft text-gold-ink",
                  )}
                >
                  {initials(name) || <Icon name="user" size={16} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      "truncate text-[14px] leading-5 font-semibold",
                      reason ? "text-ink-muted" : "text-ink",
                    )}
                  >
                    {name}
                  </span>
                  <span className="truncate text-[12px] leading-4 text-ink-muted tabular-nums">
                    {contact}
                    {contact && " · "}#{item.id}
                  </span>
                  {reason && (
                    <span id={reasonId} className="text-[12px] leading-4 text-ink-muted">
                      {reason}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 motion-reduce:transition-none",
                    isPicked
                      ? "border-gold bg-gold text-on-gold"
                      : reason
                        ? "border-transparent text-ink-muted"
                        : "border-line-strong text-ink-muted",
                  )}
                >
                  <Icon
                    name={isPicked ? "check" : item.member ? "users" : reason ? "minus" : "plus"}
                    size={14}
                  />
                </span>
              </li>
            );
          })}
        </ul>
        {lookup.status === "done" && items.length >= CUSTOMER_LOOKUP_LIMIT && (
          <p className="m-0 border-t border-line px-4 py-2 text-caption font-normal text-ink-muted">
            {t.moreHint}
          </p>
        )}
      </div>

      <span role="status" className="sr-only">
        {showList && lookup.status !== "loading" ? statusText : ""}
      </span>
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  );
}
