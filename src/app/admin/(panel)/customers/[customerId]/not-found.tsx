import { PanelNotFound } from "@/features/admin/shell/panel-not-found";

/** `notFound()` of a customer card: no such customer. */
export default function CustomerNotFound() {
  return <PanelNotFound kind="customer" />;
}
