import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { errorCopy } from "@/features/shop/content/errors";

/** Target of the proxy's rewrite for an unknown slug under `/ru` and `/en` (404). */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/gd-not-found">): Promise<Metadata> {
  const { locale } = await params;
  const copy = errorCopy[locale === "ru" ? "ru" : "en"];
  return { title: { absolute: `${copy.notFoundTitle} | Glow Derma` } };
}

export default function Page() {
  notFound();
}
