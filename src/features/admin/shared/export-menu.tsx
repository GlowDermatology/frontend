"use client";

import { useRef, useState } from "react";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ActionMenu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useAdminLocale } from "@/lib/i18n/admin-context";

import { browserActionEnv, currentPath, refreshSession } from "./action-client";
import { sharedCopy } from "./copy";
import { fetchExport, type ExportDownload } from "./export-download";

/**
 * "Eksport" menu of a list page: CSV or Excel through the section's export
 * route handler (`/admin/<section>/export?…&format=csv|xlsx`), which streams
 * Django's file (api mode) or builds a local CSV (mock mode). The file is
 * fetched and saved from a blob, so a refused export (throttle, too many
 * rows, expired session, API down) shows a danger toast «Eksport bajarilmadi»
 * (a 429 a warning «Biroz kuting») instead of navigating the tab to the
 * route's JSON answer. `label` defaults to «Eksport» in the admin language.
 */
export function ExportMenu({ href, label }: { href: string; label?: string }) {
  const locale = useAdminLocale();
  const t = sharedCopy[locale].export;
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
      let result: ExportDownload = await fetchExport(url, undefined, locale);
      if (!result.ok && result.status === 401) {
        const env = browserActionEnv();
        if (await refreshSession(env)) result = await fetchExport(url, undefined, locale);
        if (!result.ok && result.status === 401) {
          env.location.assign(`/admin/login?next=${encodeURIComponent(currentPath(env.location))}`);
          return;
        }
      }
      if (!result.ok) {
        const throttled = result.status === 429;
        toast({
          tone: throttled ? "warning" : "danger",
          title: throttled ? t.throttledTitle : t.failedTitle,
          description: result.message,
        });
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
      label={t.menu}
      busy={busy}
      triggerClassName={buttonStyles({ variant: "secondary" })}
      trigger={
        <span className="contents">
          <Icon
            name={busy ? "refresh" : "download"}
            size={18}
            className={cn(busy && "animate-spin")}
          />
          {busy ? t.preparing : (label ?? t.button)}
          <Icon name="chevron-down" size={16} />
        </span>
      }
      items={[
        {
          key: "csv",
          label: "CSV",
          hint: t.csvHint,
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
