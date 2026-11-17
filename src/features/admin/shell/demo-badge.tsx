import { Icon } from "@/components/ui/icon";
import { dataSource } from "@/data/source";
import { copyFor } from "@/lib/i18n/admin-locale";

import { shellCopy } from "./copy";

/**
 * "Demo ma’lumotlar" pill in the admin top bar, shown only while the fixtures
 * are served (`GLOWDERMA_DATA_SOURCE=mock`). Async because the source is read
 * at request time: render it inside `<Suspense fallback={null}>`.
 */
export async function DemoBadge() {
  if ((await dataSource()) !== "mock") return null;
  const t = (await copyFor(shellCopy)).demo;
  return (
    <span
      title={t.hint}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-caption text-ink-muted"
    >
      <Icon name="info" size={14} />
      {t.label}
    </span>
  );
}
