import { PlaceholderPage, placeholderMetadata } from "@/features/shop/pages/placeholder";

/** W3a placeholder (noindex); W3b replaces it with the real screen. */
export const metadata = placeholderMetadata("uz", "signIn");

export default function Page() {
  return <PlaceholderPage locale="uz" kind="signIn" />;
}
