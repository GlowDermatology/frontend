import { buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

/**
 * The store settings, contacts and legal texts (terms, privacy policy,
 * booking policy) are sensitive, so they are edited in Django's ops console
 * (two-factor sign-in, every change audited) rather than here. This card
 * points there: `consoleUrl` is `GLOWDERMA_OPS_CONSOLE_URL` normalised to
 * end with `/` (`serverEnv.opsConsoleUrl()`), or `null` when unset.
 */
export function OpsConsoleCard({ consoleUrl }: { consoleUrl: string | null }) {
  const href = opsConsoleSettingsUrl(consoleUrl);
  return (
    <Card aria-labelledby="ops-console-title" className="flex flex-col gap-4">
      <CardTitle id="ops-console-title" className="text-heading">
        Do‘kon sozlamalari
      </CardTitle>
      <p className="m-0 text-body-sm text-ink-muted">
        Do‘kon sozlamalari, aloqa ma’lumotlari va huquqiy matnlar (foydalanish shartlari, maxfiylik
        siyosati, qabul qoidalari) endi ops konsolda tahrirlanadi: u ikki bosqichli tasdiqlash (2FA)
        bilan himoyalangan va har bir o‘zgarish audit jurnaliga yoziladi.
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ variant: "secondary", className: "self-start" })}
        >
          Ops konsolda ochish
          <span className="sr-only"> (yangi oynada ochiladi)</span>
        </a>
      ) : (
        <p className="m-0 text-body-sm text-ink-muted">
          Konsol manzili sozlanmagan (GLOWDERMA_OPS_CONSOLE_URL).
        </p>
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
