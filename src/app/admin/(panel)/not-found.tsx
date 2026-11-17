import { PanelNotFound } from "@/features/admin/shell/panel-not-found";

/** Any other `notFound()` in the panel, including unknown addresses (`[...rest]`). */
export default function AdminNotFoundPage() {
  return <PanelNotFound kind="page" />;
}
