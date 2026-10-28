import type { Metadata } from "next";

import { AccountPage, accountMetadata } from "@/features/shop/pages/private/account";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** Profile, sign-in methods, addresses, terms and deletion (private). */
export function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  return accountMetadata(intlLocaleFrom(params));
}

export default function Page({ params }: PageProps<"/[locale]/account">) {
  return <AccountPage locale={intlLocaleFrom(params)} />;
}
