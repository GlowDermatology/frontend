import { Icon } from "@/components/ui/icon";
import { dataSource } from "@/data/source";

/**
 * "Demo ma’lumotlar" pill in the admin top bar, shown only while the fixtures
 * are served (`GLOWDERMA_DATA_SOURCE=mock`). Async because the source is read
 * at request time: render it inside `<Suspense fallback={null}>`.
 */
export async function DemoBadge() {
  if ((await dataSource()) !== "mock") return null;
  return (
    <span
      title="Ma’lumotlar namuna uchun; o‘zgarishlar sahifa yangilanganda tiklanadi."
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-caption text-ink-muted"
    >
      <Icon name="info" size={14} />
      Demo ma’lumotlar
    </span>
  );
}
