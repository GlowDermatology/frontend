"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import {
  DIRECTORY_ORDERINGS,
  DIRECTORY_PAGE_SIZES,
  SPECIALIST_ROLES,
  type DirectoryOrdering,
  type SpecialistListQuery,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { useCopy } from "@/lib/i18n/admin-context";

import { useListNavigation } from "../shared/list-transition";
import { specialistsCopy } from "./copy";
import { hasDirectoryFilters, specialistListHref } from "./query";

interface Props {
  query: SpecialistListQuery;
}

type Patch = Partial<SpecialistListQuery>;

function useHref(props: Props) {
  return (patch: Patch) => specialistListHref({ ...props.query, ...patch });
}

/**
 * Search (debounced), publication, discipline and ordering of the specialists list (contract
 * §2.17); every change is a URL navigation inside the list transition.
 */
export function DirectoryToolbar(props: Props) {
  const { query } = props;
  const copy = useCopy(specialistsCopy);
  const t = copy.directory;
  const m = useCopy(clinicDataCopy);
  const { navigate } = useListNavigation();
  const href = useHref(props);
  const [search, setSearch] = useState(query.q ?? "");
  const lastSubmitted = useRef(query.q ?? "");

  useEffect(() => {
    const term = search.trim();
    if (term === lastSubmitted.current) return;
    const timer = window.setTimeout(() => {
      lastSubmitted.current = term;
      navigate(href({ q: term || undefined, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, navigate, href]);

  const update = (patch: Patch) => navigate(href({ ...patch, page: 1 }));

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label={t.search}
        placeholder={t.specialistPlaceholder}
        value={search}
        maxLength={64}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_220px] gap-2 bg-transparent px-3"
      />
      <Select<"all" | "active" | "inactive">
        variant="filter"
        aria-label={t.status}
        prefix={`${t.status}:`}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          // A specialist profile's `is_active` is its publication (login is managed in Staff).
          { value: "active", label: copy.list.published },
          { value: "inactive", label: copy.list.draft },
        ]}
      />
      <Select<string>
        variant="filter"
        aria-label={t.role}
        prefix={`${t.role}:`}
        value={query.role ?? "all"}
        onValueChange={(value) =>
          update({
            role: value === "all" ? undefined : (value as SpecialistListQuery["role"]),
          })
        }
        options={[
          { value: "all", label: t.all },
          ...SPECIALIST_ROLES.map((role) => ({ value: role, label: m.role[role] })),
        ]}
      />
      <Select<DirectoryOrdering>
        variant="filter"
        aria-label={t.sort}
        prefix={`${t.sort}:`}
        value={query.sort}
        onValueChange={(sort) => update({ sort })}
        options={DIRECTORY_ORDERINGS.map((sort) => ({ value: sort, label: m.ordering[sort] }))}
      />
      {hasDirectoryFilters(query) && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            lastSubmitted.current = "";
            navigate(
              href({
                q: undefined,
                status: undefined,
                role: undefined,
                page: 1,
              }),
            );
          }}
          className="inline-flex h-11 items-center gap-2 rounded-md px-3.5 text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft"
        >
          <Icon name="close" size={18} />
          {t.clear}
        </button>
      )}
    </div>
  );
}

/** Rows per page (contract §1.5: 20 or 50). */
export function DirectoryPageSizeMenu(props: Props) {
  const t = useCopy(specialistsCopy).directory;
  const { navigate } = useListNavigation();
  const href = useHref(props);
  return (
    <Select<string>
      variant="filter"
      size="sm"
      align="end"
      aria-label={t.rows}
      value={String(props.query.pageSize)}
      onValueChange={(value) =>
        navigate(href({ pageSize: Number(value) as SpecialistListQuery["pageSize"], page: 1 }))
      }
      options={DIRECTORY_PAGE_SIZES.map((size) => ({
        value: String(size),
        label: t.rowsOption(size),
      }))}
      className="min-w-0"
    />
  );
}
