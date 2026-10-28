import type { Metadata } from "next";

import { InboxPage, inboxMetadata } from "@/features/shop/pages/private/inbox";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** The notifications inbox (private). */
export function generateMetadata({ params }: PageProps<"/[locale]/inbox">): Promise<Metadata> {
  return inboxMetadata(intlLocaleFrom(params));
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/inbox">) {
  return <InboxPage locale={intlLocaleFrom(params)} searchParams={searchParams} />;
}
