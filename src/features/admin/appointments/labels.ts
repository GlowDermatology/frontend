import { DELETED_CUSTOMER_NAME, FALLBACK_BLOCK_LABEL } from "@/data/api/mappers/appointments";
import type { Appointment, Specialist } from "@/domain/appointment";

import type { AppointmentsCopy } from "./copy";

/**
 * Display texts the data layer hands over in Uzbek (the mappers' fallbacks and the domain's
 * values), shown in the admin language. Content the API or a person wrote (a block's own label,
 * names) stays as it is.
 */

/** The discipline in the admin language; a draft profile without one (`""`) shows nothing. */
export function roleText(t: AppointmentsCopy, role: Specialist["role"]): string {
  if (!role) return "";
  return t.role[role] ?? role;
}

/** A block's label: the mapper's fallback becomes the copy's, a label from the API stays. */
export function blockText(t: AppointmentsCopy, block: Specialist["blocks"][number]): string {
  if (block.label === FALLBACK_BLOCK_LABEL.dayOff) return t.blocks.dayOff;
  if (
    !block.label ||
    block.label === FALLBACK_BLOCK_LABEL.busy ||
    block.label === FALLBACK_BLOCK_LABEL.off
  ) {
    return block.kind === "busy" ? t.blocks.busy : t.blocks.off;
  }
  return block.label;
}

export function customerName(t: AppointmentsCopy, name: string): string {
  return name === DELETED_CUSTOMER_NAME ? t.deletedCustomer : name;
}

export function viaText(t: AppointmentsCopy, via: Appointment["requestedVia"]): string {
  return t.via[via] ?? via;
}
