"use client";

import { useRef, useState } from "react";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ActionMenu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

import { browserActionEnv, currentPath, refreshSession } from "./action-client";
import { fetchExport, type ExportDownload } from "./export-download";

/**
 * "Eksport" menu of a list page: CSV or Excel through the section's export
 * route handler (`/admin/<section>/export?…&format=csv|xlsx`), which streams
 * Django's file (api mode) or builds a local CSV (mock mode). The file is
 * fetched and saved from a blob, so a refused export (throttle, too many
 * rows, expired session, API down) shows the usual "Amal bajarilmadi" toast
 * instead of navigating the tab to the route's JSON answer.
 */
export function ExportMenu({ href, label = "Eksport" }: { href: string; label?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const withFormat = (format: "csv" | "xlsx") =>
    `${href}${href.includes("?") ? "&" : "?"}format=${format}`;

  const download = async (format: "csv" | "xlsx") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const url = withFormat(format);
      let result: ExportDownload = await fetchExport(url);
      if (!result.ok && result.status === 401) {
        const env = browserActionEnv();
        if (await refreshSession(env)) result = await fetchExport(url);
        if (!result.ok && result.status === 401) {
          env.location.assign(`/admin/login?next=${encodeURIComponent(currentPath(env.location))}`);
          return;
        }
      }
      if (!result.ok) {
        toast({ tone: "info", title: "Amal bajarilmadi", description: result.message });
        return;
      }
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = result.filename;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Give the browser time to start the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <ActionMenu
      label="Eksport formati"
      triggerClassName={buttonStyles({ variant: "secondary" })}
      trigger={
        <span className="contents" aria-busy={busy}>
          <Icon
            name={busy ? "refresh" : "download"}
            size={18}
            className={cn(busy && "animate-spin")}
          />
          {busy ? "Tayyorlanmoqda…" : label}
          <Icon name="chevron-down" size={16} />
        </span>
      }
      items={[
        {
          key: "csv",
          label: "CSV",
          hint: "Excel ochadi; UTF-8",
          onSelect: () => void download("csv"),
        },
        {
          key: "xlsx",
          label: "Excel (XLSX)",
          onSelect: () => void download("xlsx"),
        },
      ]}
    />
  );
}
