import { Icon } from "@/components/ui/icon";
import { getNavCounts } from "@/data/shell";

import { IssuesAlertButton } from "./issues-badge";

/**
 * The header's delivery-issue button, streamed with the nav counts (one
 * `nav-counts/` call per request, shared with the sidebar); from then on the
 * client island polls every 30 s.
 */
export async function IssuesAlert() {
  const counts = await getNavCounts();
  return <IssuesAlertButton initial={counts?.deliveryIssuesOpen ?? null} />;
}

/** Same box while the counts stream in, so the header does not shift. */
export function IssuesAlertFallback() {
  return (
    <span
      aria-hidden="true"
      className="flex size-11 items-center justify-center rounded-md border border-line bg-surface-raised text-ink-muted"
    >
      <Icon name="alert-triangle" size={20} />
    </span>
  );
}
