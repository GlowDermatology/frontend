import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { PanelNotFound } from "@/features/admin/shell/panel-not-found";

/** A `notFound()` inside the specialist workspace: the 404 inside its shell, back to Appointments. */
export default function SpecialistNotFoundPage() {
  return <PanelNotFound kind="page" home={SPECIALIST_HOME} />;
}
