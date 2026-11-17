import type { CopySet } from "@/lib/i18n/copy";

/**
 * Settings (`/admin/settings`): the page header, the account card (password change, social
 * sign-in, sign out of other devices), the theme card and the store-settings card. The language card has
 * `language-copy.ts`, the MFA card `mfa-copy.ts`. Uzbek is the source language.
 */
const uz = {
  eyebrow: "Hisob",
  title: "Sozlamalar",
  account: {
    title: "Hisob",
    noSession: "Sessiya topilmadi",
    sessionUntil: (when: string) => `sessiya ${when} gacha`,
  },
  password: {
    title: "Parolni o‘zgartirish",
    current: "Joriy parol",
    next: "Yangi parol",
    confirm: "Yangi parolni takrorlang",
    rules: (min: number) =>
      `Kamida ${min} ta belgi; oddiy yoki faqat raqamli parol qabul qilinmaydi.`,
    submit: "Parolni o‘zgartirish",
    submitting: "O‘zgartirilmoqda…",
    changed: "Parol o‘zgartirildi",
    changedLead: "Boshqa qurilmalardagi sessiyalar yakunlandi.",
    failed: "Parol o‘zgartirilmadi",
  },
  social: {
    title: "Ijtimoiy tarmoq orqali kirish",
    off: "Google yoki Facebook orqali kirish bu serverda yoqilmagan.",
    unknown: "Ijtimoiy tarmoq holatini yuklab bo‘lmadi.",
    linked: "Bog‘langan",
    notLinked: "Bog‘lanmagan",
    unlink: "Uzish",
    unlinkLabel: (provider: string) => `${provider} hisobini uzish`,
    link: "Bog‘lash",
    linkLabel: (provider: string) => `${provider} hisobini bog‘lash`,
    unlinked: (provider: string) => `${provider} hisobi uzildi`,
    unlinkFailed: "Hisob uzilmadi",
    demoTitle: (provider: string) => `${provider} hisobi bog‘lanmadi`,
    errorTitle: (provider: string) => `${provider} hisobini bog‘lab bo‘lmadi`,
    confirmTitle: (provider: string) => `${provider} hisobini uzasizmi?`,
    confirmBody:
      "Bu hisob orqali endi kirib bo‘lmaydi. Keyin qayta bog‘lash mumkin; email va parol bilan kirish o‘zgarmaydi.",
    back: "Orqaga",
    unlinking: "Uzilmoqda…",
    busy: "Hisob uzilmoqda. Biroz kuting.",
  },
  others: {
    title: "Boshqa qurilmalardan chiqish",
    lead: "Shu brauzerdan boshqa hamma sessiyalar yakunlanadi.",
    button: "Boshqa qurilmalardan chiqish",
    confirmTitle: "Boshqa qurilmalardan chiqasizmi?",
    confirmBody:
      "Boshqa brauzer va qurilmalardagi sessiyalaringiz darhol yakunlanadi. Bu sessiya ochiq qoladi.",
    back: "Orqaga",
    submit: "Chiqish",
    done: "Boshqa qurilmalardan chiqildi",
    doneLead: "Boshqa brauzer va qurilmalardagi sessiyalar yakunlandi.",
    failed: "Boshqa qurilmalardan chiqib bo‘lmadi",
    failedLead: "Sessiyalar hali ochiq. Birozdan so‘ng qayta urinib ko‘ring.",
  },
  theme: {
    title: "Mavzu",
    lead: "Yorug‘ yoki qorong‘i ko‘rinish. «Qurilmadagidek» qurilmangiz sozlamasiga ergashadi. Tanlov shu brauzerda saqlanadi va do‘kon sahifalarida ham qo‘llanadi.",
  },
  store: {
    title: "Do‘kon sozlamalari",
    lead: "Do‘kon sozlamalari, aloqa ma’lumotlari va huquqiy matnlar (foydalanish shartlari, maxfiylik siyosati, qabul qoidalari) ops konsolda tahrirlanadi: u ikki bosqichli tasdiqlash (2FA) bilan himoyalangan va har bir o‘zgarish harakatlar jurnaliga yoziladi.",
    open: "Ops konsolda ochish",
    newWindow: " (yangi oynada ochiladi)",
    missing: "Konsol manzili sozlanmagan (GLOWDERMA_OPS_CONSOLE_URL).",
  },
};

export const settingsCopy = {
  uz,
  ru: {
    eyebrow: "Аккаунт",
    title: "Настройки",
    account: {
      title: "Аккаунт",
      noSession: "Сессия не найдена",
      sessionUntil: (when: string) => `сессия до ${when}`,
    },
    password: {
      title: "Сменить пароль",
      current: "Текущий пароль",
      next: "Новый пароль",
      confirm: "Повторите новый пароль",
      rules: (min: number) =>
        `Не меньше ${min} символов; простые и только цифровые пароли не принимаются.`,
      submit: "Сменить пароль",
      submitting: "Меняем…",
      changed: "Пароль изменён",
      changedLead: "Сессии на других устройствах завершены.",
      failed: "Пароль не изменён",
    },
    social: {
      title: "Вход через соцсети",
      off: "Вход через Google или Facebook на этом сервере не включён.",
      unknown: "Не удалось загрузить состояние соцсетей.",
      linked: "Привязан",
      notLinked: "Не привязан",
      unlink: "Отвязать",
      unlinkLabel: (provider: string) => `Отвязать аккаунт ${provider}`,
      link: "Привязать",
      linkLabel: (provider: string) => `Привязать аккаунт ${provider}`,
      unlinked: (provider: string) => `Аккаунт ${provider} отвязан`,
      unlinkFailed: "Аккаунт не отвязан",
      demoTitle: (provider: string) => `Аккаунт ${provider} не привязан`,
      errorTitle: (provider: string) => `Не удалось привязать аккаунт ${provider}`,
      confirmTitle: (provider: string) => `Отвязать аккаунт ${provider}?`,
      confirmBody:
        "Входить через этот аккаунт больше не получится. Позже его можно привязать снова; вход по email и паролю не изменится.",
      back: "Назад",
      unlinking: "Отвязываем…",
      busy: "Аккаунт отвязывается. Подождите немного.",
    },
    others: {
      title: "Выйти на других устройствах",
      lead: "Завершатся все сессии, кроме этого браузера.",
      button: "Выйти на других устройствах",
      confirmTitle: "Выйти на других устройствах?",
      confirmBody:
        "Ваши сессии в других браузерах и на других устройствах сразу завершатся. Эта сессия останется открытой.",
      back: "Назад",
      submit: "Выйти",
      done: "Вы вышли на других устройствах",
      doneLead: "Сессии в других браузерах и на других устройствах завершены.",
      failed: "Не удалось выйти на других устройствах",
      failedLead: "Сессии ещё открыты. Попробуйте чуть позже.",
    },
    theme: {
      title: "Тема",
      lead: "Светлое или тёмное оформление. «Как на устройстве» следует настройке вашего устройства. Выбор сохраняется в этом браузере и действует и на страницах магазина.",
    },
    store: {
      title: "Настройки магазина",
      lead: "Настройки магазина, контакты и юридические тексты (условия использования, политика конфиденциальности, правила записи) редактируются в ops-консоли: она защищена двухэтапной проверкой (2FA), и каждое изменение записывается в журнал действий.",
      open: "Открыть в ops-консоли",
      newWindow: " (откроется в новом окне)",
      missing: "Адрес консоли не настроен (GLOWDERMA_OPS_CONSOLE_URL).",
    },
  },
  en: {
    eyebrow: "Account",
    title: "Settings",
    account: {
      title: "Account",
      noSession: "No session found",
      sessionUntil: (when: string) => `session until ${when}`,
    },
    password: {
      title: "Change password",
      current: "Current password",
      next: "New password",
      confirm: "Repeat the new password",
      rules: (min: number) =>
        `At least ${min} characters; simple or digits-only passwords are not accepted.`,
      submit: "Change password",
      submitting: "Changing…",
      changed: "Password changed",
      changedLead: "Your sessions on other devices have been ended.",
      failed: "Password not changed",
    },
    social: {
      title: "Sign-in with social accounts",
      off: "Sign-in with Google or Facebook is not enabled on this server.",
      unknown: "Could not load the social account state.",
      linked: "Linked",
      notLinked: "Not linked",
      unlink: "Unlink",
      unlinkLabel: (provider: string) => `Unlink the ${provider} account`,
      link: "Link",
      linkLabel: (provider: string) => `Link a ${provider} account`,
      unlinked: (provider: string) => `${provider} account unlinked`,
      unlinkFailed: "Account not unlinked",
      demoTitle: (provider: string) => `${provider} account not linked`,
      errorTitle: (provider: string) => `Could not link the ${provider} account`,
      confirmTitle: (provider: string) => `Unlink the ${provider} account?`,
      confirmBody:
        "You will no longer be able to sign in with this account. You can link it again later; signing in with email and password does not change.",
      back: "Back",
      unlinking: "Unlinking…",
      busy: "The account is being unlinked. Please wait.",
    },
    others: {
      title: "Sign out of other devices",
      lead: "Every session except this browser will end.",
      button: "Sign out of other devices",
      confirmTitle: "Sign out of other devices?",
      confirmBody:
        "Your sessions in other browsers and on other devices end right away. This session stays open.",
      back: "Back",
      submit: "Sign out",
      done: "Signed out of other devices",
      doneLead: "Your sessions in other browsers and on other devices have ended.",
      failed: "Could not sign out of other devices",
      failedLead: "The sessions are still open. Try again in a moment.",
    },
    theme: {
      title: "Theme",
      lead: "A light or dark look. “Match device” follows your device's setting. The choice is saved in this browser and applies to the store pages too.",
    },
    store: {
      title: "Store settings",
      lead: "Store settings, contact details and legal texts (terms of use, privacy policy, booking rules) are edited in the ops console: it is protected by two-step verification (2FA) and every change is written to the audit log.",
      open: "Open in the ops console",
      newWindow: " (opens in a new window)",
      missing: "The console address is not set (GLOWDERMA_OPS_CONSOLE_URL).",
    },
  },
} satisfies CopySet<typeof uz>;

export type SettingsCopy = (typeof settingsCopy)["uz"];
