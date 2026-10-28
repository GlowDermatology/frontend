import type { Metadata } from "next";

import { InboxPage, inboxMetadata } from "@/features/shop/pages/private/inbox";

/** The notifications inbox (private). */
export function generateMetadata(): Promise<Metadata> {
  return inboxMetadata("uz");
}

export default function Page({ searchParams }: PageProps<"/xabarlar">) {
  return <InboxPage locale={"uz"} searchParams={searchParams} />;
}
