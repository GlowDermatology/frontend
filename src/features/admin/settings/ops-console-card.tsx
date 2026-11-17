import { buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

import type { SettingsCopy } from "./copy";

/**
 * The store settings, contacts and legal texts (terms, privacy policy,
 * booking policy) are sensitive, so they are edited in Django's ops console
 * (two-factor sign-in, every change audited) rather than here. This card
 * points there: `consoleUrl` is `GLOWDERMA_OPS_CONSOLE_URL` normalised to
 * end with `/` (`serverEnv.opsConsoleUrl()`), or `null` when unset.
 */
export function OpsConsoleCard({
  consoleUrl,
  t,
}: {
  consoleUrl: string | null;
  /** `settingsCopy[locale].store` (a server component: the page passes its language's texts). */
  t: SettingsCopy["store"];
}) {
  const href = opsConsoleSettingsUrl(consoleUrl);
  return (
    <Card aria-labelledby="ops-console-title" className="flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
        >
          <Icon name="store" size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle id="ops-console-title">{t.title}</CardTitle>
          <p className="m-0 text-body-sm [text-wrap:pretty] text-ink-muted">{t.lead}</p>
        </div>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ variant: "secondary", className: "self-start" })}
        >
          {t.open}
          <span className="sr-only">{t.newWindow}</span>
        </a>
      ) : (
        <p className="m-0 text-body-sm text-ink-muted">{t.missing}</p>
      )}
    </Card>
  );
}

/** The console's settings page under its base URL, or `null` without a base. */
export function opsConsoleSettingsUrl(consoleUrl: string | null): string | null {
  if (!consoleUrl) return null;
  try {
    return new URL("settings/", consoleUrl).toString();
  } catch {
    return null;
  }
}
