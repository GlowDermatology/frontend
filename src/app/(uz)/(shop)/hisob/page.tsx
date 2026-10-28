import type { Metadata } from "next";

import { AccountPage, accountMetadata } from "@/features/shop/pages/private/account";

/** Profile, sign-in methods, addresses, terms and deletion (private). */
export function generateMetadata(): Promise<Metadata> {
  return accountMetadata("uz");
}

export default function Page() {
  return <AccountPage locale={"uz"} />;
}
