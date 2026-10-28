import type { Metadata } from "next";

import { SignInPage, signInMetadata } from "@/features/shop/pages/private/sign-in";

/** Sign in, sign up and password reset (private: noindex, never cached). */
export function generateMetadata(): Promise<Metadata> {
  return signInMetadata("uz");
}

export default function Page({ searchParams }: PageProps<"/kirish">) {
  return <SignInPage locale="uz" searchParams={searchParams} />;
}
