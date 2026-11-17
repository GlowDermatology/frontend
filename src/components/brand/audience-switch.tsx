import { cn } from "@/lib/cn";

export type AuthAudience = "customer" | "staff";

/** The staff sign-in route: the «Xodim» end of the customer page's switch. */
export const STAFF_SIGN_IN_PATH = "/admin/login";

export interface AudienceSwitchLinks {
  /** Accessible name of the switch (`<nav aria-label>`), e.g. «Kim sifatida kirasiz». */
  label: string;
  customer: { href: string; label: string };
  staff: { href: string; label: string };
}

const ORDER: ReadonlyArray<AuthAudience> = ["customer", "staff"];

/**
 * «Mijoz | Xodim» on the sign-in pages: two plain links between the customer and the staff sign-in
 * routes, styled as a segmented control. Links, not tabs: each audience is its own page with its
 * own cookies, guards and CSP, so switching is a navigation (and works without JavaScript). The
 * current one carries `aria-current="page"`.
 */
export function AudienceSwitch({
  current,
  links,
  className,
}: {
  current: AuthAudience;
  links: AudienceSwitchLinks;
  className?: string;
}) {
  return (
    <nav aria-label={links.label} className={className}>
      <ul className="m-0 grid list-none grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1">
        {ORDER.map((audience) => {
          const link = links[audience];
          const active = audience === current;
          return (
            <li key={audience} className="flex">
              <a
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-full px-4 text-label whitespace-nowrap no-underline transition-[background-color,color,box-shadow] duration-200 ease-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink",
                  active
                    ? "bg-ink text-surface shadow-sm"
                    : "text-ink-muted hover:bg-gold-soft hover:text-ink",
                )}
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
