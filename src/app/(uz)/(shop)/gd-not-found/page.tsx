import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { errorCopy } from "@/features/shop/content/errors";

/**
 * Target of the proxy's rewrite for an unknown product, category or
 * specialist slug: answers 404 with this language's storefront not-found
 * page (the slug pages stream, so they could only render a 200). Next adds
 * the `noindex` robots tag of a 404 itself.
 */
export const metadata: Metadata = {
  title: { absolute: `${errorCopy.uz.notFoundTitle} | Glow Derma` },
};

export default function Page() {
  notFound();
}
