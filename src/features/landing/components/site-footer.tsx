import { SECTION_IDS, siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { gutter, textLink } from "./primitives";

const top = `#${SECTION_IDS.top}`;
const footerLink = cn("text-[15px] leading-[22px] font-semibold text-ink", textLink);
const heading = "m-0 text-overline text-ink-muted uppercase";

export function SiteFooter({ dict }: { dict: LandingDictionary }) {
  const { footer, nav } = dict;
  const { links } = siteConfig;
  return (
    <footer className="flex-[1_0_auto] border-t border-line bg-surface">
      <div className={cn("mx-auto flex max-w-[1280px] flex-col gap-12 pt-14 pb-8", gutter)}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-10">
          <div className="flex flex-col gap-3.5">
            <span className="font-serif text-[30px] leading-9 font-semibold text-ink">Glow Derma</span>
            <p className="m-0 max-w-[260px] text-[14px] leading-[22px] text-ink-muted">{footer.tagline}</p>
          </div>
          <nav aria-labelledby="footer-app" className="flex flex-col gap-3">
            <h2 id="footer-app" className={heading}>
              {footer.appHeading}
            </h2>
            <a href={`#${SECTION_IDS.catalog}`} className={footerLink}>
              {nav.catalog}
            </a>
            <a href={`#${SECTION_IDS.cashback}`} className={footerLink}>
              {nav.cashback}
            </a>
            <a href={`#${SECTION_IDS.qr}`} className={footerLink}>
              {nav.qr}
            </a>
            <a href={`#${SECTION_IDS.specialists}`} className={footerLink}>
              {nav.specialists}
            </a>
          </nav>
          <div className="flex flex-col gap-3">
            <h2 className={heading}>{footer.contactHeading}</h2>
            <address className="text-[15px] leading-[22px] text-ink not-italic">{footer.address}</address>
            <a href={links.phone ? `tel:${links.phone}` : top} className={footerLink}>
              {footer.phone}
            </a>
            <a href={links.telegram ?? top} className={footerLink}>
              Telegram
            </a>
            <a href={links.instagram ?? top} className={footerLink}>
              Instagram
            </a>
          </div>
          <nav aria-labelledby="footer-docs" className="flex flex-col gap-3">
            <h2 id="footer-docs" className={heading}>
              {footer.docsHeading}
            </h2>
            <a href={links.privacyPolicy ?? top} className={footerLink}>
              {footer.privacy}
            </a>
            <a href={links.termsOfUse ?? top} className={footerLink}>
              {footer.terms}
            </a>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-body-sm text-ink-muted">
          <span>{footer.copyright}</span>
          <span>{footer.languages}</span>
        </div>
      </div>
    </footer>
  );
}
