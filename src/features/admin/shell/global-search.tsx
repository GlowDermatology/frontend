"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SearchInput } from "@/components/ui/field";
import { useCopy } from "@/lib/i18n/admin-context";

import { shellCopy } from "./copy";

/**
 * Header search. Orders search covers order numbers, phone numbers and
 * customer names, so submitting opens the filtered orders list.
 */
export function GlobalSearch() {
  const t = useCopy(shellCopy).search;
  const router = useRouter();
  const [value, setValue] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/admin/orders?q=${encodeURIComponent(q)}` : "/admin/orders");
  };

  return (
    <form role="search" onSubmit={onSubmit} className="max-w-[480px] min-w-0 flex-[1_1_280px]">
      <SearchInput
        label={t.label}
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t.placeholder}
        enterKeyHint="search"
      />
    </form>
  );
}
