import { buttonStyles } from "@/components/ui/button";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import type { Locale } from "../i18n";
import { LanguageSwitcher } from "./language-switcher";
import { gutter, textLink } from "./primitives";
import { TabletMenu } from "./tablet-menu";

interface SiteHeaderProps {
  dict: LandingDictionary;
  locale: Locale;
}

export function SiteHeader({ dict, locale }: SiteHeaderProps) {
  const links = [
    { href: `#${SECTION_IDS.catalog}`, label: dict.nav.catalog },
    { href: `#${SECTION_IDS.cashback}`, label: dict.nav.cashback },
    { href: `#${SECTION_IDS.specialists}`, label: dict.nav.specialists },
    { href: `#${SECTION_IDS.delivery}`, label: dict.nav.delivery },
  ];

  return (
    <header className="relative border-b border-line bg-surface">
      <div
        className={cn(
          "mx-auto flex max-w-[1280px] items-center justify-between gap-6 py-4",
          gutter,
        )}
      >
        <a
          href={`#${SECTION_IDS.top}`}
          aria-label={dict.header.home}
          className={cn(
            "font-serif text-[30px] leading-9 font-semibold tracking-[-0.01em] whitespace-nowrap text-ink",
            textLink,
          )}
        >
          Glow Derma
        </a>

        <nav aria-label={dict.header.navLabel} className="hidden nav:block">
          <ul className="m-0 flex list-none items-center gap-9 p-0 text-[15px] font-semibold">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={cn("whitespace-nowrap text-ink", textLink)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher current={locale} label={dict.header.languageLabel} />
          <a
            href={`#${SECTION_IDS.download}`}
            className={buttonStyles({
              size: "md",
              lift: true,
              className: "hidden px-5 leading-[normal] sm:inline-flex",
            })}
          >
            {dict.header.download}
          </a>
          <TabletMenu
            links={links}
            openLabel={dict.header.menuOpen}
            closeLabel={dict.header.menuClose}
          />
        </div>
      </div>
    </header>
  );
}
