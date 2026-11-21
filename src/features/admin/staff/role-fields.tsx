"use client";

import type { ReactNode } from "react";

import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { StaffAccountRole } from "@/domain/staff";
import { useCopy } from "@/lib/i18n/admin-context";

import { staffCopy } from "./copy";

/**
 * «Rol»: Staff, Manager or Specialist (one staff sign-in page, three account roles). `roles` lists
 * what may be picked here (the edit dialog offers Staff / Manager only: the Specialist change is
 * its own confirmed action); `restrictions` explains an option that cannot be picked now.
 */
export function AccountRoleField({
  role,
  roles = ["staff", "manager", "specialist"],
  onChange,
  disabledReason,
  restrictions,
  hint,
}: {
  role: StaffAccountRole;
  roles?: ReadonlyArray<StaffAccountRole>;
  onChange: (role: StaffAccountRole) => void;
  disabledReason?: string | false | null;
  restrictions?: Partial<Record<StaffAccountRole, string>>;
  /** Replaces the chosen role's description under the field. */
  hint?: ReactNode;
}) {
  const t = useCopy(staffCopy);
  return (
    <Field label={t.roleField.label} name="role" hint={hint ?? t.roleField.descriptions[role]}>
      {(control) => (
        <Select<StaffAccountRole>
          {...control}
          name="role"
          value={role}
          disabledReason={disabledReason}
          onValueChange={onChange}
          options={roles.map((value) => ({
            value,
            label: t.roles[value],
            description: t.roleField.descriptions[value],
            disabledReason: restrictions?.[value],
          }))}
        />
      )}
    </Field>
  );
}
