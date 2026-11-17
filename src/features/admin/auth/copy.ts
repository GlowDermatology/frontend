import { pluralEn } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Staff sign-in (`/admin/login`) and the shared staff auth frame (DESIGN §F): page texts, the art
 * panel, the «Mijoz | Xodim» switch, the small language switch and the login messages (also used
 * by the `login` Server Action). Later staff auth pages (set-password, change-password, MFA step)
 * reuse `frame`, `audience` and `language`.
 */
const uz = {
  meta: { title: "Kirish" },
  frame: {
    eyebrow: "Glow Derma · boshqaruv paneli",
    headline: "Klinika va do‘kon — bitta oynada",
    points: {
      orders: "Buyurtmalar, to‘lovlar va yetkazib berish",
      appointments: "Qabullar va mutaxassislar jadvali",
      customers: "Mijozlar, cashback va bildirishnomalar",
    },
    footnote: "Faqat Glow Derma xodimlari uchun. Har bir kirish harakatlar jurnaliga yoziladi.",
  },
  audience: { label: "Kim sifatida kirasiz", customer: "Mijoz", staff: "Xodim" },
  language: {
    label: "Interfeys tili",
    changing: "Til almashtirilmoqda…",
  },
  form: {
    title: "Tizimga kirish",
    lead: "Xodim hisobingizning email va parolini kiriting.",
    email: "Email",
    emailPlaceholder: "ism@glowderma.uz",
    password: "Parol",
    submit: "Kirish",
    submitting: "Kirilmoqda…",
    or: "yoki",
    continueWith: (provider: string) => `${provider} orqali kirish`,
    fakeProvider: (provider: string) => `${provider} orqali kirish (sinov)`,
  },
  loading: "Yuklanmoqda…",
  notices: {
    passwordSet: "Parol o‘rnatildi. Endi email va yangi parol bilan kiring.",
    mfaExpired:
      "Kirish muddati tugadi yoki bekor qilindi. Xavfsizlik uchun email va parolni qaytadan kiriting.",
  },
  errors: {
    emailRequired: "Emailni kiriting.",
    emailInvalid: "Email manzili noto‘g‘ri: ism@domen.uz ko‘rinishida kiriting.",
    passwordRequired: "Parolni kiriting.",
    invalidForm: "Email va parolni kiriting.",
    invalidCredentials: "Login yoki parol noto‘g‘ri.",
    unreachable: "API bilan bog‘lanib bo‘lmadi.",
    staleForm: "Sahifani yangilab, qayta urinib ko‘ring.",
    throttled: "Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.",
    throttledFor: (seconds: number) =>
      `Juda ko‘p urinish. ${seconds} soniyadan so‘ng qayta urinib ko‘ring.`,
  },
};

export const staffAuthCopy = {
  uz,
  ru: {
    meta: { title: "Вход" },
    frame: {
      eyebrow: "Glow Derma · панель управления",
      headline: "Клиника и магазин — в одном окне",
      points: {
        orders: "Заказы, платежи и доставка",
        appointments: "Приёмы и расписание специалистов",
        customers: "Клиенты, кешбэк и уведомления",
      },
      footnote: "Только для сотрудников Glow Derma. Каждый вход записывается в журнал действий.",
    },
    audience: { label: "Как вы входите", customer: "Клиент", staff: "Сотрудник" },
    language: {
      label: "Язык интерфейса",
      changing: "Меняем язык…",
    },
    form: {
      title: "Вход в систему",
      lead: "Введите email и пароль своей учётной записи сотрудника.",
      email: "Email",
      emailPlaceholder: "имя@glowderma.uz",
      password: "Пароль",
      submit: "Войти",
      submitting: "Входим…",
      or: "или",
      continueWith: (provider: string) => `Войти через ${provider}`,
      fakeProvider: (provider: string) => `Войти через ${provider} (тест)`,
    },
    loading: "Загрузка…",
    notices: {
      passwordSet: "Пароль установлен. Теперь войдите с почтой и новым паролем.",
      mfaExpired:
        "Время входа истекло или вход отменён. Ради безопасности введите email и пароль ещё раз.",
    },
    errors: {
      emailRequired: "Введите email.",
      emailInvalid: "Неверный адрес email: введите в виде имя@домен.uz.",
      passwordRequired: "Введите пароль.",
      invalidForm: "Введите email и пароль.",
      invalidCredentials: "Неверный логин или пароль.",
      unreachable: "Не удалось связаться с API.",
      staleForm: "Обновите страницу и попробуйте ещё раз.",
      throttled: "Слишком много попыток. Попробуйте чуть позже.",
      throttledFor: (seconds: number) =>
        `Слишком много попыток. Попробуйте снова через ${seconds} с.`,
    },
  },
  en: {
    meta: { title: "Sign in" },
    frame: {
      eyebrow: "Glow Derma · admin panel",
      headline: "The clinic and the shop, in one place",
      points: {
        orders: "Orders, payments and delivery",
        appointments: "Appointments and specialist schedules",
        customers: "Customers, cashback and notifications",
      },
      footnote: "For Glow Derma staff only. Every sign-in is recorded in the audit log.",
    },
    audience: { label: "Who is signing in", customer: "Customer", staff: "Staff" },
    language: {
      label: "Interface language",
      changing: "Switching the language…",
    },
    form: {
      title: "Sign in",
      lead: "Enter the email and password of your staff account.",
      email: "Email",
      emailPlaceholder: "name@glowderma.uz",
      password: "Password",
      submit: "Sign in",
      submitting: "Signing in…",
      or: "or",
      continueWith: (provider: string) => `Continue with ${provider}`,
      fakeProvider: (provider: string) => `Continue with ${provider} (test)`,
    },
    loading: "Loading…",
    notices: {
      passwordSet: "Your password is set. Sign in with your email and the new password.",
      mfaExpired:
        "The sign-in expired or was cancelled. For your security, enter your email and password again.",
    },
    errors: {
      emailRequired: "Enter your email.",
      emailInvalid: "This email address is not valid: use the form name@domain.uz.",
      passwordRequired: "Enter your password.",
      invalidForm: "Enter your email and password.",
      invalidCredentials: "Wrong login or password.",
      unreachable: "Could not reach the API.",
      staleForm: "Please reload the page and try again.",
      throttled: "Too many attempts. Please try again a little later.",
      throttledFor: (seconds: number) =>
        `Too many attempts. Please try again in ${seconds} ${pluralEn(seconds, ["second", "seconds"])}.`,
    },
  },
} satisfies CopySet<typeof uz>;

export type StaffAuthCopy = (typeof staffAuthCopy)[keyof typeof staffAuthCopy];
