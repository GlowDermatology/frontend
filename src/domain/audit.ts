/**
 * Audit log (contract §2.13, actions of §3.2). Labels are Uzbek; an action or
 * object type the table does not know yet is shown as the raw code, so a
 * newer backend never breaks the screen.
 */

export interface AuditEntry {
  id: string;
  at: string;
  /** Staff display name; `null` = the system ("Tizim"). */
  actor: string | null;
  actorId: string | null;
  action: string;
  objectType: string;
  /** Always a string on the API (slugs); `""` when the action has no object. */
  objectId: string;
  /** Action-specific payload; shown as escaped, indented JSON. */
  data: unknown;
  ip: string | null;
  requestId: string;
}

const MODEL_LABELS = {
  location: "Filial",
  professional: "Mutaxassis",
  service: "Xizmat",
  professional_service: "Mutaxassis xizmati",
  working_hours: "Ish vaqti",
  blocked_period: "Band davr",
  working_hours_override: "Ish vaqti istisnosi",
} as const;

const MODEL_VERBS = { created: "qo‘shildi", updated: "o‘zgartirildi", deleted: "o‘chirildi" };

function modelActions(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [model, label] of Object.entries(MODEL_LABELS)) {
    for (const [verb, text] of Object.entries(MODEL_VERBS)) {
      result[`${model}.${verb}`] = `${label} ${text}`;
    }
  }
  return result;
}

/**
 * Every §3.2 action (M1), including the M1d appointment and override
 * additions, and the M3 operations actions (requeued and hand-resolved outbox
 * messages, Billz sales recorded by hand, retention purges, the nightly
 * consistency report, cancelled campaigns).
 */
export const AUDIT_ACTION_LABELS: Readonly<Record<string, string>> = {
  // Auth
  "auth.login_succeeded": "Tizimga kirdi",
  "auth.login_failed": "Kirish muvaffaqiyatsiz",
  "auth.logout": "Tizimdan chiqdi",
  "auth.password_changed": "Parol o‘zgartirildi",
  "auth.session_revoked": "Sessiya bekor qilindi",
  "auth.staff_deactivated": "Xodim o‘chirildi",
  "auth.staff_reactivated": "Xodim qayta faollashtirildi",
  "auth.social_linked": "Ijtimoiy hisob bog‘landi",
  "auth.social_unlinked": "Ijtimoiy hisob uzildi",
  // System
  "outbox.dead": "Navbatdagi xabar yuborilmadi",
  "outbox.requeued": "Navbatdagi xabar qayta navbatga qo‘yildi",
  "outbox.resolved": "Navbatdagi xabar qo‘lda yopildi",
  "outbox.purged": "Bajarilgan navbat xabarlari tozalandi",
  "integrations.inbox_purged": "Eski provayder xabarlari tozalandi",
  "report.consistency": "Tungi muvofiqlik hisoboti",
  // Orders
  "order.cancelled": "Buyurtma bekor qilindi",
  "order.status_changed": "Buyurtma holati o‘zgardi",
  "order.shipment_retry_requested": "BTS qayta yuborish so‘raldi",
  "refund.requested": "Qaytarish so‘raldi",
  "refund.state_changed": "Qaytarish holati o‘zgardi",
  // Catalog
  "product.created": "Mahsulot qo‘shildi",
  "product.updated": "Mahsulot o‘zgartirildi",
  "product.image_added": "Mahsulot rasmi qo‘shildi",
  "product.image_deleted": "Mahsulot rasmi o‘chirildi",
  "product.images_reordered": "Mahsulot rasmlari tartiblandi",
  "billz.import_started": "Billz importi boshlandi",
  "billz.import_finished": "Billz importi tugadi",
  "billz.sale_recorded_by_hand": "Billz savdosi qo‘lda belgilandi",
  "billz.payment_attempt_forgotten": "Billz to‘lov urinishi belgisi olib tashlandi",
  "category.created": "Kategoriya qo‘shildi",
  "category.updated": "Kategoriya o‘zgartirildi",
  "category.deleted": "Kategoriya o‘chirildi",
  "category.reordered": "Kategoriyalar tartiblandi",
  "banner.created": "Banner qo‘shildi",
  "banner.updated": "Banner o‘zgartirildi",
  "banner.deleted": "Banner o‘chirildi",
  "banner.reordered": "Bannerlar tartiblandi",
  // Loyalty
  "cashback.adjusted": "Cashback tuzatildi",
  "cashback.policy_version_created": "Cashback siyosati versiyasi yaratildi",
  "cashback.policy_version_superseded": "Cashback siyosati versiyasi almashtirildi",
  "loyalty.reconciliation_completed": "Cashback balanslari tekshirildi",
  "loyalty.reconciliation_mismatch": "Cashback balansida nomuvofiqlik",
  // Notifications
  "notification.created": "Bildirishnoma yaratildi",
  "notification.cancelled": "Bildirishnoma bekor qilindi",
  "notification.push_dead": "Push yuborilmadi",
  "notification_template.updated": "Holat shabloni o‘zgartirildi",
  "segment.created": "Guruh yaratildi",
  "segment.updated": "Guruh o‘zgartirildi",
  "segment.deleted": "Guruh o‘chirildi",
  "segment.members_added": "Guruhga mijozlar qo‘shildi",
  "segment.member_removed": "Guruhdan mijoz chiqarildi",
  // Appointments
  "appointment.confirmed": "Qabul tasdiqlandi",
  "appointment.rejected": "Qabul rad etildi",
  "appointment.attended": "Qabulga keldi",
  "appointment.created": "Qabul yozildi",
  "appointment.rescheduled": "Qabul ko‘chirildi",
  "appointment.cancelled": "Qabul bekor qilindi",
  // Shell
  "settings.updated": "Sozlamalar o‘zgartirildi",
  "export.downloaded": "Eksport yuklab olindi",
  // Django admin (editable models), incl. working_hours_override.* (T13)
  ...modelActions(),
};

/** Groups for the action filter, in the §3.2 order. */
export const AUDIT_ACTION_GROUPS: ReadonlyArray<{ label: string; prefixes: string[] }> = [
  { label: "Kirish", prefixes: ["auth."] },
  { label: "Tizim", prefixes: ["outbox.", "integrations.", "report."] },
  { label: "Buyurtmalar", prefixes: ["order.", "refund."] },
  { label: "Katalog", prefixes: ["product.", "billz.", "category.", "banner."] },
  { label: "Cashback", prefixes: ["cashback.", "loyalty."] },
  { label: "Bildirishnomalar", prefixes: ["notification.", "notification_template.", "segment."] },
  { label: "Qabullar", prefixes: ["appointment."] },
  { label: "Sozlamalar va eksport", prefixes: ["settings.", "export."] },
  { label: "Django admin", prefixes: Object.keys(MODEL_LABELS).map((model) => `${model}.`) },
];

/** The Uzbek label of an action, or the raw code for an unknown one. */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export const AUDIT_OBJECT_LABELS: Readonly<Record<string, string>> = {
  staff: "Xodim",
  order: "Buyurtma",
  orders: "Buyurtmalar",
  refund: "Qaytarish",
  payment: "To‘lov",
  payments: "To‘lovlar",
  product: "Mahsulot",
  products: "Mahsulotlar",
  category: "Kategoriya",
  categories: "Kategoriyalar",
  banner: "Banner",
  banners: "Bannerlar",
  job: "Jarayon",
  customer: "Mijoz",
  customers: "Mijozlar",
  policy_version: "Cashback siyosati",
  loyalty: "Cashback hisoblari",
  // The backend's object type of a push campaign (`notification.created`, `.cancelled`).
  campaign: "Bildirishnoma",
  notifications: "Bildirishnomalar",
  notification_template: "Holat shabloni",
  segment: "Guruh",
  segments: "Guruhlar",
  appointment: "Qabul",
  settings: "Sozlamalar",
  outbox: "Navbat",
  webhook_inbox: "Provayder xabarlari",
  report: "Hisobot",
  auth_session: "Sessiya",
  "audit-log": "Harakatlar jurnali",
  ...MODEL_LABELS,
};

/** The Uzbek label of an object type, or the raw type. */
export function auditObjectLabel(objectType: string): string {
  return AUDIT_OBJECT_LABELS[objectType] ?? objectType;
}

/** The data payload as indented JSON text (rendered as text, never as HTML). */
export function auditDataText(data: unknown): string {
  if (data === null || data === undefined) return "—";
  try {
    return JSON.stringify(data, null, 2) ?? "—";
  } catch {
    return String(data);
  }
}

export const AUDIT_ORDERINGS = ["-at", "at"] as const;
export type AuditOrdering = (typeof AUDIT_ORDERINGS)[number];

/** The URL filters of the audit log (they map 1:1 to the API's query parameters). */
export interface AuditFilters {
  actor?: string;
  action?: string;
  objectType?: string;
  objectId?: string;
  dateFrom?: string;
  dateTo?: string;
  ordering: AuditOrdering;
  page: number;
}
