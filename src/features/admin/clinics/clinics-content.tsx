import { requireStaff } from "@/data/auth";
import { listClinics } from "@/data/clinic";

import { ClinicsView } from "./clinics-view";

export async function ClinicsContent() {
  await requireStaff();
  return <ClinicsView clinics={await listClinics()} />;
}
