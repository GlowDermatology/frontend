import { notFound } from "next/navigation";

/**
 * Target of the proxy's rewrite for an unknown product, category or
 * specialist slug: answers 404 with this language's storefront not-found
 * page (the slug pages stream, so they could only render a 200).
 */
export default function Page() {
  notFound();
}
