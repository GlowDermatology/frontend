import { PanelNotFound } from "@/features/admin/shell/panel-not-found";

/** `notFound()` of an order page: no order with that number. */
export default function OrderNotFound() {
  return <PanelNotFound kind="order" />;
}
