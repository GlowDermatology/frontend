import type { SiteSettings } from "@/domain/settings";

/** The settings singleton as the backend seeds it (contract §2.11). */
export const MOCK_SETTINGS: SiteSettings = {
  reservationMinutes: 15,
  supportPhone: "+998712000000",
  pickupAddress: { uz: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko‘chasi, 12", ru: "", en: "" },
  storePhone: "+998712000001",
  cosmetologistPhone: "+998712000002",
  telegramUrl: "https://t.me/glowderma",
  instagramUrl: "https://instagram.com/glowderma",
  websiteUrl: "https://glowderma.uz",
  terms: {
    uz: "Glow Derma xizmatlaridan foydalanish shartlari.\n\nNamuna matn (demo): haqiqiy matnni Sozlamalar bo‘limida kiriting.",
    ru: "Условия использования приложения Glow Derma.\n\nДемонстрационный текст: настоящий текст вводится в разделе «Настройки».",
    en: "Glow Derma app terms of use.\n\nDemo text: enter the real text under Settings.",
  },
  privacyPolicy: {
    uz: "Maxfiylik siyosati: shaxsiy ma’lumotlaringiz O‘zbekiston hududida saqlanadi.\n\nNamuna matn (demo): haqiqiy matnni Sozlamalar bo‘limida kiriting.",
    ru: "Политика конфиденциальности: ваши персональные данные хранятся в Узбекистане.\n\nДемонстрационный текст: настоящий текст вводится в разделе «Настройки».",
    en: "Privacy policy: your personal data is stored in Uzbekistan.\n\nDemo text: enter the real text under Settings.",
  },
  bookingPolicy: {
    uz: "Qabul boshlanishidan oldin istalgan vaqtda bepul bekor qilishingiz mumkin.",
    ru: "Запись можно бесплатно отменить в любое время до её начала.",
    en: "You can cancel a booking free of charge at any time before it starts.",
  },
  termsVersion: "20241220-1",
  termsUpdatedAt: "2024-12-20T10:00:00+05:00",
  termsUnpublishedChanges: false,
  integrationsMode: "fake",
  updatedAt: "2026-10-10T10:00:00+05:00",
  updatedBy: null,
};
