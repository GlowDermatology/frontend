/** A staff member as the audit-log actor filter lists them (contract §2.16 `StaffListItem`). */
export interface StaffMember {
  id: string;
  /** Full name, else the email. */
  name: string;
  email: string;
  isActive: boolean;
}
