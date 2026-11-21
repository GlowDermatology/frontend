import { pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

import type { AdminSection } from "./nav-items";

/**
 * Strings of the admin shell (sidebar, header, drawer, error and not-found views) and the page
 * titles of `src/app/admin/(panel)/**`. Uzbek is the source language; the brand words
 * "Glow Derma" and "Admin" are not translated.
 */
const nav: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  products: "Mahsulotlar",
  categories: "Kategoriyalar",
  banners: "Bannerlar",
  orders: "Buyurtmalar",
  "delivery-issues": "Muammolar",
  appointments: "Qabullar",
  specialists: "Mutaxassislar",
  clinics: "Klinikalar",
  services: "Xizmatlar",
  customers: "Mijozlar",
  cashback: "Cashback sozlamalari",
  notifications: "Bildirishnomalar",
  payments: "To‘lovlar",
  "audit-log": "Harakatlar jurnali",
  staff: "Xodimlar",
  settings: "Sozlamalar",
};

const uz = {
  skipToContent: "Asosiy kontentga o‘tish",
  sections: "Admin bo‘limlari",
  openMenu: "Menyuni ochish",
  closeMenu: "Menyuni yopish",
  loading: "Yuklanmoqda…",
  nav,
  navCount: {
    orders: (count: number) => ` — ${count} ta jarayonda`,
    appointments: (count: number) => ` — ${count} ta tasdiq kutmoqda`,
  },
  ai: { label: "AI tahlil", badge: "2-BOSQICH", reason: "Keyingi bosqichda qo‘shiladi." },
  search: { label: "Qidirish", placeholder: "Buyurtma, mijoz yoki mahsulot" },
  notifications: "Bildirishnomalar",
  issues: {
    none: "Yetkazish muammolari: ochiq muammo yo‘q",
    some: (open: number, urgent: number) =>
      `Yetkazish muammolari: ${open} ta ochiq${urgent > 0 ? `, ${urgent} tasi shoshilinch` : ""}`,
    pill: (open: number, urgent: number) =>
      ` — ${open} ta ochiq${urgent > 0 ? `, ${urgent} tasi shoshilinch` : ""}`,
    toastTitle: (orderId: number) => `Shoshilinch: buyurtma №${orderId}`,
    toastDescription: (kind: string, code: string) =>
      `${kind} · ${code}. «Muammolar» bo‘limida ko‘ring.`,
    moreTitle: (rest: number) => `Yana ${rest} ta shoshilinch muammo`,
    moreDescription: "«Muammolar» bo‘limida ko‘ring.",
  },
  billz: {
    connected: "Billz ulangan",
    disconnected: "Billz ulanmagan",
    synced: (when: string) => `Sinxronlangan: ${when}`,
    neverSynced: "hali sinxronlanmagan",
    unknown: "Billz holati noma’lum",
  },
  demo: {
    label: "Demo ma’lumotlar",
    hint: "Ma’lumotlar namuna uchun; o‘zgarishlar sahifa yangilanganda tiklanadi.",
  },
  user: {
    noSession: "Sessiya topilmadi",
    logout: "Chiqish",
    /** The top bar profile menu trigger. */
    menuLabel: "Profil menyusi",
    unreadNotifications: "Ko‘rilmagan bildirishnomalar",
    settings: "Sozlamalar",
    /** The «Til ›» row; its submenu lists the three admin languages. */
    language: "Til",
  },
  contentError: {
    title: "Bo‘limni yuklab bo‘lmadi",
    description:
      "Ma’lumotlarni olishda xatolik yuz berdi. Qayta urinib ko‘ring yoki chap menyudan boshqa bo‘limga o‘ting; muammo takrorlansa, quyidagi kodni administratorga yuboring.",
    code: "Xato kodi:",
    retry: "Qayta urinish",
  },
  pageError: {
    title: "Xatolik yuz berdi",
    description:
      "Sahifani yuklab bo‘lmadi. Qayta urinib ko‘ring; muammo takrorlansa, quyidagi kodni administratorga yuboring.",
    code: "Xato kodi:",
    retry: "Qayta urinish",
  },
  titles: {
    ...nav,
    newProduct: "Yangi mahsulot",
    product: "Mahsulot",
    order: (id: number) => `Buyurtma №${id}`,
    orderNotFound: "Buyurtma topilmadi",
    customer: "Mijoz",
    groups: "Guruhlar",
    groupMembers: "Guruh a’zolari",
    specialist: "Mutaxassis",
    notFound: "Sahifa topilmadi",
  },
  notFound: {
    page: {
      title: "Sahifa topilmadi",
      description: "Bu manzil admin panelda mavjud emas yoki yozuv o‘chirilgan.",
      back: "Dashboardga qaytish",
    },
    order: {
      title: "Buyurtma topilmadi",
      description: "Bunday raqamli buyurtma yo‘q. Raqamni tekshiring yoki ro‘yxatdan qidiring.",
      back: "Buyurtmalar ro‘yxati",
    },
    customer: {
      title: "Mijoz topilmadi",
      description: "Bunday mijoz yo‘q yoki havola noto‘g‘ri.",
      back: "Mijozlar",
    },
    product: {
      title: "Mahsulot topilmadi",
      description: "Bu mahsulot o‘chirilgan yoki havola noto‘g‘ri.",
      back: "Mahsulotlar ro‘yxati",
    },
    specialist: {
      title: "Mutaxassis topilmadi",
      description: "Bunday mutaxassis yo‘q yoki havola noto‘g‘ri.",
      back: "Mutaxassislar",
    },
  },
};

const navRu: Record<AdminSection, string> = {
  dashboard: "Дашборд",
  products: "Товары",
  categories: "Категории",
  banners: "Баннеры",
  orders: "Заказы",
  "delivery-issues": "Проблемы",
  appointments: "Приёмы",
  specialists: "Специалисты",
  clinics: "Клиники",
  services: "Услуги",
  customers: "Клиенты",
  cashback: "Настройки кешбэка",
  notifications: "Уведомления",
  payments: "Платежи",
  "audit-log": "Журнал действий",
  staff: "Сотрудники",
  settings: "Настройки",
};

const navEn: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
  banners: "Banners",
  orders: "Orders",
  "delivery-issues": "Issues",
  appointments: "Appointments",
  specialists: "Specialists",
  clinics: "Clinics",
  services: "Services",
  customers: "Customers",
  cashback: "Cashback settings",
  notifications: "Notifications",
  payments: "Payments",
  "audit-log": "Audit log",
  staff: "Staff",
  settings: "Settings",
};

const urgentRu = (urgent: number) =>
  urgent > 0 ? `, ${urgent} ${pluralRu(urgent, ["срочная", "срочные", "срочных"])}` : "";
const urgentEn = (urgent: number) => (urgent > 0 ? `, ${urgent} urgent` : "");

export const shellCopy = {
  uz,
  ru: {
    skipToContent: "Перейти к основному содержимому",
    sections: "Разделы админки",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    loading: "Загрузка…",
    nav: navRu,
    navCount: {
      orders: (count: number) => ` — ${count} в обработке`,
      appointments: (count: number) => ` — ${count} ждут подтверждения`,
    },
    ai: { label: "AI-аналитика", badge: "ЭТАП 2", reason: "Появится на следующем этапе." },
    search: { label: "Поиск", placeholder: "Заказ, клиент или товар" },
    notifications: "Уведомления",
    issues: {
      none: "Проблемы доставки: открытых нет",
      some: (open: number, urgent: number) =>
        `Проблемы доставки: ${open} ${pluralRu(open, ["открытая", "открытые", "открытых"])}${urgentRu(urgent)}`,
      pill: (open: number, urgent: number) =>
        ` — ${open} ${pluralRu(open, ["открытая", "открытые", "открытых"])}${urgentRu(urgent)}`,
      toastTitle: (orderId: number) => `Срочно: заказ №${orderId}`,
      toastDescription: (kind: string, code: string) =>
        `${kind} · ${code}. Смотрите раздел «Проблемы».`,
      moreTitle: (rest: number) =>
        `Ещё ${rest} ${pluralRu(rest, ["срочная проблема", "срочные проблемы", "срочных проблем"])}`,
      moreDescription: "Смотрите раздел «Проблемы».",
    },
    billz: {
      connected: "Billz подключён",
      disconnected: "Billz не подключён",
      synced: (when: string) => `Синхронизация: ${when}`,
      neverSynced: "ещё не синхронизировано",
      unknown: "Состояние Billz неизвестно",
    },
    demo: {
      label: "Демо-данные",
      hint: "Данные для примера; изменения сбрасываются при обновлении страницы.",
    },
    user: {
      noSession: "Сессия не найдена",
      logout: "Выйти",
      menuLabel: "Меню профиля",
      unreadNotifications: "Непросмотренные уведомления",
      settings: "Настройки",
      language: "Язык",
    },
    contentError: {
      title: "Не удалось загрузить раздел",
      description:
        "При получении данных произошла ошибка. Попробуйте ещё раз или перейдите в другой раздел в меню слева; если ошибка повторится, отправьте администратору код ниже.",
      code: "Код ошибки:",
      retry: "Повторить",
    },
    pageError: {
      title: "Произошла ошибка",
      description:
        "Не удалось загрузить страницу. Попробуйте ещё раз; если ошибка повторится, отправьте администратору код ниже.",
      code: "Код ошибки:",
      retry: "Повторить",
    },
    titles: {
      ...navRu,
      newProduct: "Новый товар",
      product: "Товар",
      order: (id: number) => `Заказ №${id}`,
      orderNotFound: "Заказ не найден",
      customer: "Клиент",
      groups: "Группы",
      groupMembers: "Участники группы",
      specialist: "Специалист",
      notFound: "Страница не найдена",
    },
    notFound: {
      page: {
        title: "Страница не найдена",
        description: "Такого адреса нет в админке, или запись удалена.",
        back: "Вернуться на дашборд",
      },
      order: {
        title: "Заказ не найден",
        description: "Заказа с таким номером нет. Проверьте номер или найдите заказ в списке.",
        back: "Список заказов",
      },
      customer: {
        title: "Клиент не найден",
        description: "Такого клиента нет, или ссылка неверна.",
        back: "Клиенты",
      },
      product: {
        title: "Товар не найден",
        description: "Товар удалён, или ссылка неверна.",
        back: "Список товаров",
      },
      specialist: {
        title: "Специалист не найден",
        description: "Такого специалиста нет, или ссылка неверна.",
        back: "Специалисты",
      },
    },
  },
  en: {
    skipToContent: "Skip to main content",
    sections: "Admin sections",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    loading: "Loading…",
    nav: navEn,
    navCount: {
      orders: (count: number) => ` — ${count} in progress`,
      appointments: (count: number) => ` — ${count} awaiting confirmation`,
    },
    ai: { label: "AI insights", badge: "PHASE 2", reason: "Coming in the next phase." },
    search: { label: "Search", placeholder: "Order, customer or product" },
    notifications: "Notifications",
    issues: {
      none: "Delivery issues: none open",
      some: (open: number, urgent: number) => `Delivery issues: ${open} open${urgentEn(urgent)}`,
      pill: (open: number, urgent: number) => ` — ${open} open${urgentEn(urgent)}`,
      toastTitle: (orderId: number) => `Urgent: order No. ${orderId}`,
      toastDescription: (kind: string, code: string) =>
        `${kind} · ${code}. See the «Issues» section.`,
      moreTitle: (rest: number) => `${rest} more urgent ${pluralEn(rest, ["issue", "issues"])}`,
      moreDescription: "See the «Issues» section.",
    },
    billz: {
      connected: "Billz connected",
      disconnected: "Billz not connected",
      synced: (when: string) => `Synced: ${when}`,
      neverSynced: "not synced yet",
      unknown: "Billz status unknown",
    },
    demo: {
      label: "Demo data",
      hint: "Sample data; changes are reset when the page reloads.",
    },
    user: {
      noSession: "No session found",
      logout: "Sign out",
      menuLabel: "Profile menu",
      unreadNotifications: "Unseen notifications",
      settings: "Settings",
      language: "Language",
    },
    contentError: {
      title: "This section could not be loaded",
      description:
        "Something went wrong while loading the data. Try again or open another section from the menu on the left; if it keeps happening, send the code below to an administrator.",
      code: "Error code:",
      retry: "Try again",
    },
    pageError: {
      title: "Something went wrong",
      description:
        "The page could not be loaded. Try again; if it keeps happening, send the code below to an administrator.",
      code: "Error code:",
      retry: "Try again",
    },
    titles: {
      ...navEn,
      newProduct: "New product",
      product: "Product",
      order: (id: number) => `Order No. ${id}`,
      orderNotFound: "Order not found",
      customer: "Customer",
      groups: "Groups",
      groupMembers: "Group members",
      specialist: "Specialist",
      notFound: "Page not found",
    },
    notFound: {
      page: {
        title: "Page not found",
        description: "This address does not exist in the admin panel, or the record was deleted.",
        back: "Back to the dashboard",
      },
      order: {
        title: "Order not found",
        description: "There is no order with this number. Check the number or search the list.",
        back: "Order list",
      },
      customer: {
        title: "Customer not found",
        description: "This customer does not exist, or the link is wrong.",
        back: "Customers",
      },
      product: {
        title: "Product not found",
        description: "This product was deleted, or the link is wrong.",
        back: "Product list",
      },
      specialist: {
        title: "Specialist not found",
        description: "This specialist does not exist, or the link is wrong.",
        back: "Specialists",
      },
    },
  },
} satisfies CopySet<typeof uz>;

export type ShellCopy = CopySet<typeof uz>[keyof CopySet<typeof uz>];
