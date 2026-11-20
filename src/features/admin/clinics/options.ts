import type { SelectOption } from "@/components/ui/select";
import { clinicText, type ClinicLocation } from "@/domain/clinic";
import type { Locale } from "@/lib/i18n/locales";

export function clinicOptions(
  clinics: ReadonlyArray<ClinicLocation>,
  locale: Locale,
): SelectOption[] {
  return clinics.map((clinic) => ({
    value: clinic.id,
    label: clinicText(clinic.name, locale),
    description: clinicText(clinic.address, locale),
  }));
}
