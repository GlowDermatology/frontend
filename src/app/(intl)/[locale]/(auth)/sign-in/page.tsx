import type { Metadata } from "next";

import { SignInPage, signInMetadata } from "@/features/shop/pages/private/sign-in";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** Sign in, sign up and password reset (private: noindex, never cached). */
export function generateMetadata({ params }: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  return signInMetadata(intlLocaleFrom(params));
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  return <SignInPage locale={intlLocaleFrom(params)} searchParams={searchParams} />;
}
