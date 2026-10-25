"use client";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ActionMenu } from "@/components/ui/menu";

/**
 * "Eksport" menu of a list page: CSV or Excel through the section's export
 * route handler (`/admin/<section>/export?…&format=csv|xlsx`), which streams
 * Django's file (api mode) or builds a local CSV (mock mode).
 */
export function ExportMenu({ href, label = "Eksport" }: { href: string; label?: string }) {
  const withFormat = (format: "csv" | "xlsx") =>
    `${href}${href.includes("?") ? "&" : "?"}format=${format}`;
  return (
    <ActionMenu
      label="Eksport formati"
      triggerClassName={buttonStyles({ variant: "secondary" })}
      trigger={
        <>
          <Icon name="download" size={18} />
          {label}
          <Icon name="chevron-down" size={16} />
        </>
      }
      items={[
        {
          key: "csv",
          label: "CSV",
          hint: "Excel ochadi; UTF-8",
          onSelect: () => window.location.assign(withFormat("csv")),
        },
        {
          key: "xlsx",
          label: "Excel (XLSX)",
          onSelect: () => window.location.assign(withFormat("xlsx")),
        },
      ]}
    />
  );
}
