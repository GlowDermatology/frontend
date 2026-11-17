import type { CopySet } from "@/lib/i18n/copy";

/**
 * The manager's «MFA ni o‘chirish» dialog on the staff page (DESIGN §E "MFA"); the title, body,
 * button and success texts are `staffCopy.confirm.resetMfa`. Uzbek is the source language.
 */
const uz = {
  reason: "Sabab (ixtiyoriy)",
  reasonHint: "Masalan: «telefon yo‘qolgan». Ko‘pi bilan 200 ta belgi.",
  sessions: "Xodimning barcha ochiq sessiyalari ham yakunlanadi.",
  selfReason: "O‘z ikki bosqichli himoyangizni «Sozlamalar»da o‘chiring.",
  failed: "MFA o‘chirilmadi",
};

export const resetMfaCopy = {
  uz,
  ru: {
    reason: "Причина (необязательно)",
    reasonHint: "Например: «потерян телефон». Не более 200 символов.",
    sessions: "Все открытые сессии сотрудника тоже завершатся.",
    selfReason: "Свою двухэтапную защиту отключите в «Настройках».",
    failed: "MFA не отключена",
  },
  en: {
    reason: "Reason (optional)",
    reasonHint: "For example: “lost phone”. Up to 200 characters.",
    sessions: "All of their open sessions end as well.",
    selfReason: "Turn off your own two-step protection in Settings.",
    failed: "MFA not turned off",
  },
} satisfies CopySet<typeof uz>;
