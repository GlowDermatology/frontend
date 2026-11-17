import { PanelNotFound } from "@/features/admin/shell/panel-not-found";

/** `notFound()` of the product editor: no such product. */
export default function ProductNotFound() {
  return <PanelNotFound kind="product" />;
}
