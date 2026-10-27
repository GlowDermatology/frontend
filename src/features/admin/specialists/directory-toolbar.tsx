"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SelectMenu } from "@/components/ui/menu";
import {
  DIRECTORY_ORDERING_LABEL,
  DIRECTORY_ORDERINGS,
  DIRECTORY_PAGE_SIZES,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SPECIALIST_ROLE_LABEL,
  SPECIALIST_ROLES,
  type DirectoryOrdering,
  type ServiceListQuery,
  type SpecialistListQuery,
} from "@/domain/clinic";

import { useListNavigation } from "../shared/list-transition";
import { hasDirectoryFilters, serviceListHref, specialistListHref } from "./query";

type Props =
  | { kind: "specialists"; query: SpecialistListQuery }
  | { kind: "services"; query: ServiceListQuery };

type Patch = Partial<SpecialistListQuery & ServiceListQuery>;

function useHref(props: Props) {
  return (patch: Patch) =>
    props.kind === "specialists"
      ? specialistListHref({ ...props.query, ...patch } as SpecialistListQuery)
      : serviceListHref({ ...props.query, ...patch } as ServiceListQuery);
}

const STATUS_LABEL = { active: "Faol", inactive: "Nofaol" } as const;

/**
 * Search (debounced), status, role or category and ordering of the
 * specialists and services lists (contract §2.17); every change is a URL
 * navigation inside the list transition.
 */
export function DirectoryToolbar(props: Props) {
  const { query } = props;
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
        label="Nomi bo‘yicha qidirish"
        placeholder={props.kind === "specialists" ? "Mutaxassis ismi" : "Xizmat nomi"}
        value={search}
        maxLength={64}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_220px] gap-2 bg-transparent px-3"
      />
      <SelectMenu<"all" | "active" | "inactive">
        label="Holat"
        trigger={`Holat: ${query.status ? STATUS_LABEL[query.status] : "Hammasi"}`}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "active", label: STATUS_LABEL.active },
          { value: "inactive", label: STATUS_LABEL.inactive },
        ]}
      />
      {props.kind === "specialists" ? (
        <SelectMenu<string>
          label="Mutaxassislik"
          trigger={`Mutaxassislik: ${props.query.role ? SPECIALIST_ROLE_LABEL[props.query.role] : "Hammasi"}`}
          value={props.query.role ?? "all"}
          onValueChange={(value) =>
            update({
              role: value === "all" ? undefined : (value as SpecialistListQuery["role"]),
            })
          }
          options={[
            { value: "all", label: "Hammasi" },
            ...SPECIALIST_ROLES.map((role) => ({
              value: role,
              label: SPECIALIST_ROLE_LABEL[role],
            })),
          ]}
        />
      ) : (
        <SelectMenu<string>
          label="Kategoriya"
          trigger={`Kategoriya: ${props.query.category ? SERVICE_CATEGORY_LABEL[props.query.category] : "Hammasi"}`}
          value={props.query.category ?? "all"}
          onValueChange={(value) =>
            update({
              category: value === "all" ? undefined : (value as ServiceListQuery["category"]),
            })
          }
          options={[
            { value: "all", label: "Hammasi" },
            ...SERVICE_CATEGORIES.map((category) => ({
              value: category,
              label: SERVICE_CATEGORY_LABEL[category],
            })),
          ]}
        />
      )}
      <SelectMenu<DirectoryOrdering>
        label="Saralash"
        trigger={`Saralash: ${DIRECTORY_ORDERING_LABEL[query.sort]}`}
        value={query.sort}
        onValueChange={(sort) => update({ sort })}
        options={DIRECTORY_ORDERINGS.map((sort) => ({
          value: sort,
          label: DIRECTORY_ORDERING_LABEL[sort],
        }))}
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
                category: undefined,
                page: 1,
              }),
            );
          }}
          className="inline-flex h-11 items-center gap-2 rounded-md px-3.5 text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft"
        >
          <Icon name="close" size={18} />
          Filtrlarni tozalash
        </button>
      )}
    </div>
  );
}

/** Rows per page (contract §1.5: 20 or 50). */
export function DirectoryPageSizeMenu(props: Props) {
  const { navigate } = useListNavigation();
  const href = useHref(props);
  return (
    <SelectMenu<string>
      label="Sahifadagi qatorlar"
      align="end"
      trigger={`${props.query.pageSize} ta qator`}
      triggerClassName="h-9 gap-1.5 px-3 text-[13px] leading-[18px] font-semibold"
      value={String(props.query.pageSize)}
      onValueChange={(value) =>
        navigate(href({ pageSize: Number(value) as SpecialistListQuery["pageSize"], page: 1 }))
      }
      options={DIRECTORY_PAGE_SIZES.map((size) => ({
        value: String(size),
        label: `${size} ta qator`,
      }))}
    />
  );
}
