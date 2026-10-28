import type { Metadata } from "next";

import { SessionsPage, sessionsMetadata } from "@/features/shop/pages/private/account";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** «Faol seanslar»: every signed-in phone and browser (private). */
export function generateMetadata({ params }: PageProps<"/[locale]/sessions">): Promise<Metadata> {
  return sessionsMetadata(intlLocaleFrom(params));
}

export default function Page({ params }: PageProps<"/[locale]/sessions">) {
  return <SessionsPage locale={intlLocaleFrom(params)} />;
}
