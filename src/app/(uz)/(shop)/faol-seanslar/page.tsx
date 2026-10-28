import type { Metadata } from "next";

import { SessionsPage, sessionsMetadata } from "@/features/shop/pages/private/account";

/** «Faol seanslar»: every signed-in phone and browser (private). */
export function generateMetadata(): Promise<Metadata> {
  return sessionsMetadata("uz");
}

export default function Page() {
  return <SessionsPage locale={"uz"} />;
}
