import type { SiteSettings } from "@/domain/settings";

/** The settings singleton as the backend seeds it (contract §2.11). */
export const MOCK_SETTINGS: SiteSettings = {
  reservationMinutes: 15,
  supportPhone: "+998712000000",
  pickupAddress: { uz: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko‘chasi, 12", ru: "", en: "" },
  integrationsMode: "fake",
  updatedAt: "2026-10-10T10:00:00+05:00",
  updatedBy: null,
};
