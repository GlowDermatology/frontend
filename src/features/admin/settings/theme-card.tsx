import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ThemeSegments, type ThemeLabels } from "@/components/ui/theme-control";

import type { SettingsCopy } from "./copy";

/**
 * Settings → «Mavzu»: the same light · dark · like-the-device switch as the profile menu, as a
 * segmented control (native radios). It applies at once and is saved in this browser (cookie
 * `gd_theme`, shared with the storefront), not on the account — hence no «Saqlash» button.
 */
export function ThemeCard({
  t,
  labels,
}: {
  /** `settingsCopy[locale].theme` (the page passes its language's texts). */
  t: SettingsCopy["theme"];
  /** `themeCopy[locale]`. */
  labels: ThemeLabels;
}) {
  return (
    <Card aria-labelledby="theme-card-title" className="flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
        >
          <Icon name="moon" size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle id="theme-card-title">{t.title}</CardTitle>
          <p className="m-0 text-body-sm [text-wrap:pretty] text-ink-muted">{t.lead}</p>
        </div>
      </div>
      {/* A phone has no room for the three labels in a row («Qurilmadagidek», «Как на
          устройстве»): there the choices stack, full width; a row from `sm`. */}
      <ThemeSegments
        variant="standalone"
        layout="fill"
        labels={labels}
        className="grid-flow-row sm:grid-flow-col sm:self-start"
      />
    </Card>
  );
}
