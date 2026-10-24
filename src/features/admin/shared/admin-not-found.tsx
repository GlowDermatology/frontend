import Link from "next/link";
import type { Route } from "next";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface AdminNotFoundProps {
  title: string;
  description: string;
  backHref: Route;
  backLabel: string;
}

/** 404 body inside the admin shell, so the navigation stays available. */
export function AdminNotFound({ title, description, backHref, backLabel }: AdminNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-lg bg-surface-raised p-8 shadow-sm">
      <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
        <Icon name="search" size={22} />
      </span>
      <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">{title}</h1>
      <p className="m-0 max-w-[52ch] text-body text-ink-muted">{description}</p>
      <Link href={backHref} className={buttonStyles({ variant: "secondary" })}>
        <Icon name="chevron-left" size={18} />
        {backLabel}
      </Link>
    </section>
  );
}
