"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { searchProducts, type ProductPick } from "@/data/products.actions";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../shared/action-client";
import { bannersCopy } from "./copy";

interface ProductPickerProps {
  /** Selected product id, or `null`. */
  value: string | null;
  onChange: (product: ProductPick | null) => void;
  error?: string;
  describedBy?: string;
  /** The search box's id (the field's label points at it). */
  id?: string;
}

/**
 * Picks an active product by searching the catalog (`searchProducts`, up to
 * 8 matches per term: name, Billz name, Billz id or the numeric id). The
 * selection is shown as a chip with a "change" control; an initial `value`
 * is resolved by searching its id.
 */
export function ProductPicker({ value, onChange, error, describedBy, id }: ProductPickerProps) {
  const t = useCopy(bannersCopy).picker;
  const listId = useId();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ProductPick[]>([]);
  // The picker mounts with the field's value (the dialog mounts fresh per
  // opening); a preselected id shows as "Mahsulot #id" until it is resolved.
  const [selected, setSelected] = useState<ProductPick | null>(() =>
    value === null ? null : { id: value, name: "", billzId: "" },
  );
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(value === null);
  const latest = useRef(0);

  const search = async (q: string) => {
    const call = ++latest.current;
    // Drop the previous term's rows so a stale match cannot be picked.
    setResults([]);
    setSearching(true);
    const result = await runAction((csrf) => searchProducts(q, csrf));
    if (call !== latest.current) return;
    setSearching(false);
    if (!result.ok) {
      setMessage(result.error);
      setResults([]);
      return;
    }
    setMessage(null);
    setResults(result.data);
    return result.data;
  };

  // Resolve the name of a preselected product (edit dialog) by its id: the
  // search matches a numeric term against `id` exactly (contract §2.3).
  const initialValue = useRef(value);
  useEffect(() => {
    const initial = initialValue.current;
    if (initial === null) return;
    let cancelled = false;
    runAction((csrf) => searchProducts(initial, csrf)).then((result) => {
      if (cancelled || !result.ok) return;
      const found = result.data.find((product) => product.id === initial);
      if (found) setSelected((current) => (current?.id === initial ? found : current));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editing) return;
    const timer = window.setTimeout(() => void search(term), term ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [term, editing]);

  const pick = (product: ProductPick) => {
    setSelected(product);
    setEditing(false);
    onChange(product);
  };

  if (!editing && selected) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border-[1.5px] border-line-strong bg-surface-raised px-3.5 py-2.5",
          error && "border-danger",
        )}
        aria-describedby={describedBy}
      >
        <Thumb src={selected.imageUrl} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm font-bold text-ink">
            {selected.name || t.pending(selected.id)}
          </span>
          <span className="text-caption font-normal text-ink-muted tabular-nums">
            ID {selected.id}
            {selected.billzId ? ` · Billz ${selected.billzId}` : ""}
          </span>
        </span>
        <button
          type="button"
          id={id}
          onClick={() => {
            setEditing(true);
            setTerm("");
          }}
          className="shrink-0 rounded-sm text-body-sm font-bold text-ink underline-offset-4 hover:underline"
        >
          {t.change}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-describedby={describedBy}>
      <SearchInput
        id={id}
        label={t.search}
        placeholder={t.placeholder}
        value={term}
        maxLength={64}
        onChange={(event) => setTerm(event.target.value)}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        wrapperClassName={cn(error && "border-danger")}
      />
      <div
        id={listId}
        role="listbox"
        aria-label={t.results}
        aria-busy={searching || undefined}
        className="max-h-[232px] overflow-y-auto rounded-md border border-line"
      >
        {results.length === 0 ? (
          <p className="m-0 px-3.5 py-3 text-body-sm text-ink-muted">
            {message ?? (searching ? t.searching : t.none)}
          </p>
        ) : (
          results.map((product) => (
            <button
              key={product.id}
              type="button"
              role="option"
              aria-selected={selected?.id === product.id}
              onClick={() => pick(product)}
              className="flex w-full items-center gap-3 border-b border-line px-3.5 py-2 text-left last:border-b-0 hover:bg-gold-soft focus-visible:bg-gold-soft focus-visible:outline-none"
            >
              <Thumb src={product.imageUrl} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-sm font-semibold text-ink">{product.name}</span>
                <span className="text-caption font-normal text-ink-muted tabular-nums">
                  {`ID ${product.id} · Billz ${product.billzId}`}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** 36×36 fixed box, photo or placeholder. */
function Thumb({ src }: { src?: string }) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface text-ink-muted">
      {src ? (
        <Image src={src} alt="" fill sizes="36px" className="object-cover" />
      ) : (
        <Icon name="image" size={16} />
      )}
    </span>
  );
}
