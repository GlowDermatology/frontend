import { createFormatter, pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Texts of the dashboard (/admin) in uz / ru / en: the period switch and its dialog, the stat
 * cards, the order-state tiles, the charts, the recent orders and the attention list. The
 * bucket labels and the "last week" notes come with the data (`src/domain/copy/dashboard.ts`).
 */
const uzN = createFormatter("uz").number;
const ruN = createFormatter("ru").number;
const enN = createFormatter("en").number;

const uz = {
  title: "Dashboard",
  range: {
    label: "Davr",
    today: "Bugun",
    week: "Hafta",
    month: "Oy",
    custom: "Tanlash",
    customLabel: (range: string) => `Tanlangan davr: ${range}`,
    dialogTitle: "Sana oralig‘i",
    dialogText: (max: number) =>
      `Toshkent vaqti bo‘yicha, ko‘pi bilan ${uzN(max)} kun. Ikki kungacha soatlar, undan uzunrog‘i kunlar bo‘yicha ko‘rsatiladi.`,
    back: "Orqaga",
    show: "Ko‘rsatish",
    loading: "Ko‘rsatkichlar yuklanmoqda — biroz kuting.",
    invalid: (problem: string) =>
      `Sana oralig‘i noto‘g‘ri (${problem}). Bugungi ko‘rsatkichlar ko‘rsatilmoqda.`,
    fix: "Oraliqni tuzatish",
  },
  stats: {
    orders: "Buyurtmalar",
    revenue: "Tushum",
    revenueNote: "so‘m · to‘langan buyurtmalar",
    newCustomers: "Yangi mijozlar",
    newCustomersNote: "ilovada ro‘yxatdan o‘tgan",
    totalCustomers: "Jami mijozlar",
    deletedNote: (n: number) => `shundan ${uzN(n)} tasi o‘chirilgan`,
    outOfStock: "Tugagan mahsulotlar",
    seeList: "Ro‘yxatni ko‘rish",
  },
  fulfilment: {
    title: "Buyurtmalar holati",
    note: "Hozirgi holat · davrga bog‘liq emas",
    tiles: {
      paidToPrepare: { label: "To‘langan · tayyorlash", note: "to‘langan, hali yig‘ilmagan" },
      toHandToCourier: { label: "Kuryerga berish kerak", note: "Yandex kuryeri chaqirilgan" },
      inDelivery: { label: "Yetkazilmoqda", note: "kuryerda, yo‘lda" },
      returning: { label: "Qaytarilmoqda", note: "omborga qaytayotgan jo‘natmalar" },
      completedToday: { label: "Bugun yakunlangan", note: "bugun topshirilgan" },
      needsAction: { label: "Harakat kerak", note: "ochiq yetkazish muammolari" },
      urgent: { label: "Shoshilinch", note: "darhol ko‘rib chiqing" },
    },
  },
  charts: {
    revenue: "Tushum, so‘m",
    orders: "Buyurtmalar soni",
    hint: (chart: string) => `${chart} — strelkalar bilan ko‘ring`,
    revenuePoint: (label: string, amount: string) => `${label}: ${amount} so‘m`,
    revenueValue: (amount: string) => `${amount} so‘m`,
    ordersValue: (n: number) => `${uzN(n)} ta buyurtma`,
    empty: "Bu davrda buyurtma yo‘q",
  },
  recent: {
    title: "So‘nggi buyurtmalar",
    all: "Barchasi",
    table: "So‘nggi buyurtmalar jadvali",
    columns: {
      number: "№",
      customer: "MIJOZ",
      date: "SANA",
      total: "SUMMA",
      method: "USUL",
      status: "HOLAT",
    },
    empty: "Hali buyurtma yo‘q",
  },
  attention: {
    title: "Diqqat talab qiladi",
    empty: "Hozircha hammasi joyida.",
    btsFailed: (n: number) => `${uzN(n)} ta buyurtma BTS ga yuborilmadi`,
    btsFailedBody: "Avtomatik urinish muvaffaqiyatsiz. Qo‘lda yuboring.",
    btsPolling: "BTS kuzatuvi ishlamayapti · buyurtma holatlari yangilanmayapti",
    yandex: "Yandex Dostavka javob bermayapti · narxlar va holatlar yangilanmayapti",
    yandexBody: "Yandex kabinetidagi balans va kalitni tekshiring; ochiq muammolarni ko‘ring.",
    cashbackPolicy: "Cashback siyosati yo‘q · xaridlarga cashback yozilmayapti",
    cashbackPolicyBody: "Cashback sozlamalarida yangi versiya qo‘shing.",
    appointments: (n: number) => `${uzN(n)} ta qabul tasdiq kutmoqda`,
    nextAppointment: (at: string) => `Eng yaqini: ${at}`,
    review: "Ko‘rib chiqing",
    refunds: (n: number) => `${uzN(n)} ta qaytarish tekshiruv kutmoqda`,
    refundsBody: "Xato, holati noma’lum yoki qo‘lda qaytariladigan qaytarishlarni ko‘rib chiqing.",
    billz: (n: number) => `Billz’dan ${uzN(n)} ta yangi mahsulot`,
    billzBody: "Tavsif va rasmlarni to‘ldirib, faollashtiring.",
  },
};

export type DashboardCopy = typeof uz;

const ru: typeof uz = {
  title: "Дашборд",
  range: {
    label: "Период",
    today: "Сегодня",
    week: "Неделя",
    month: "Месяц",
    custom: "Выбрать",
    customLabel: (range: string) => `Выбранный период: ${range}`,
    dialogTitle: "Диапазон дат",
    dialogText: (max: number) =>
      `По ташкентскому времени, не больше ${ruN(max)} ${pluralRu(max, ["дня", "дней", "дней"])}. До двух дней — по часам, дольше — по дням.`,
    back: "Назад",
    show: "Показать",
    loading: "Показатели загружаются — подождите немного.",
    invalid: (problem: string) =>
      `Неверный диапазон дат (${problem}). Показаны показатели за сегодня.`,
    fix: "Исправить диапазон",
  },
  stats: {
    orders: "Заказы",
    revenue: "Выручка",
    revenueNote: "сум · оплаченные заказы",
    newCustomers: "Новые клиенты",
    newCustomersNote: "зарегистрировались в приложении",
    totalCustomers: "Всего клиентов",
    deletedNote: (n: number) => `из них удалено: ${ruN(n)}`,
    outOfStock: "Закончившиеся товары",
    seeList: "Открыть список",
  },
  fulfilment: {
    title: "Состояние заказов",
    note: "Текущее состояние · не зависит от периода",
    tiles: {
      paidToPrepare: { label: "Оплачено · собрать", note: "оплачены, ещё не собраны" },
      toHandToCourier: { label: "Передать курьеру", note: "курьер Yandex вызван" },
      inDelivery: { label: "В доставке", note: "у курьера, в пути" },
      returning: { label: "Возвращаются", note: "посылки на пути обратно на склад" },
      completedToday: { label: "Завершено сегодня", note: "переданы сегодня" },
      needsAction: { label: "Нужно действие", note: "открытые проблемы доставки" },
      urgent: { label: "Срочно", note: "посмотрите немедленно" },
    },
  },
  charts: {
    revenue: "Выручка, сум",
    orders: "Количество заказов",
    hint: (chart: string) => `${chart} — листайте стрелками`,
    revenuePoint: (label: string, amount: string) => `${label}: ${amount} сум`,
    revenueValue: (amount: string) => `${amount} сум`,
    ordersValue: (n: number) => `${ruN(n)} ${pluralRu(n, ["заказ", "заказа", "заказов"])}`,
    empty: "За этот период заказов нет",
  },
  recent: {
    title: "Последние заказы",
    all: "Все",
    table: "Таблица последних заказов",
    columns: {
      number: "№",
      customer: "КЛИЕНТ",
      date: "ДАТА",
      total: "СУММА",
      method: "СПОСОБ",
      status: "СТАТУС",
    },
    empty: "Заказов пока нет",
  },
  attention: {
    title: "Требует внимания",
    empty: "Пока всё в порядке.",
    btsFailed: (n: number) =>
      `${ruN(n)} ${pluralRu(n, ["заказ не передан", "заказа не переданы", "заказов не передано"])} в BTS`,
    btsFailedBody: "Автоматическая попытка не удалась. Передайте вручную.",
    btsPolling: "Отслеживание BTS не работает · статусы заказов не обновляются",
    yandex: "Yandex Доставка не отвечает · цены и статусы не обновляются",
    yandexBody: "Проверьте баланс и ключ в кабинете Yandex; посмотрите открытые проблемы.",
    cashbackPolicy: "Нет политики кешбэка · кешбэк за покупки не начисляется",
    cashbackPolicyBody: "Добавьте новую версию в настройках кешбэка.",
    appointments: (n: number) =>
      `${ruN(n)} ${pluralRu(n, ["приём ждёт", "приёма ждут", "приёмов ждут"])} подтверждения`,
    nextAppointment: (at: string) => `Ближайший: ${at}`,
    review: "Посмотрите",
    refunds: (n: number) =>
      `${ruN(n)} ${pluralRu(n, ["возврат ждёт", "возврата ждут", "возвратов ждут"])} проверки`,
    refundsBody:
      "Посмотрите возвраты с ошибкой, с неизвестным статусом или требующие ручного возврата.",
    billz: (n: number) =>
      `${ruN(n)} ${pluralRu(n, ["новый товар", "новых товара", "новых товаров"])} из Billz`,
    billzBody: "Заполните описание и фото, затем активируйте.",
  },
};

const en: typeof uz = {
  title: "Dashboard",
  range: {
    label: "Period",
    today: "Today",
    week: "Week",
    month: "Month",
    custom: "Custom",
    customLabel: (range: string) => `Chosen period: ${range}`,
    dialogTitle: "Date range",
    dialogText: (max: number) =>
      `Tashkent time, up to ${enN(max)} ${pluralEn(max, ["day", "days"])}. Up to two days are shown by hour, longer ranges by day.`,
    back: "Back",
    show: "Show",
    loading: "The figures are loading — one moment.",
    invalid: (problem: string) =>
      `The date range is not valid (${problem}). Showing today’s figures.`,
    fix: "Fix the range",
  },
  stats: {
    orders: "Orders",
    revenue: "Revenue",
    revenueNote: "UZS · paid orders",
    newCustomers: "New customers",
    newCustomersNote: "signed up in the app",
    totalCustomers: "Total customers",
    deletedNote: (n: number) => `${enN(n)} of them deleted`,
    outOfStock: "Out-of-stock products",
    seeList: "See the list",
  },
  fulfilment: {
    title: "Order status",
    note: "Current state · independent of the period",
    tiles: {
      paidToPrepare: { label: "Paid · to prepare", note: "paid, not packed yet" },
      toHandToCourier: { label: "Hand to courier", note: "Yandex courier called" },
      inDelivery: { label: "Out for delivery", note: "with the courier, on the way" },
      returning: { label: "Returning", note: "parcels on their way back to the warehouse" },
      completedToday: { label: "Completed today", note: "handed over today" },
      needsAction: { label: "Needs action", note: "open delivery issues" },
      urgent: { label: "Urgent", note: "check right away" },
    },
  },
  charts: {
    revenue: "Revenue, UZS",
    orders: "Number of orders",
    hint: (chart: string) => `${chart} — use the arrow keys`,
    revenuePoint: (label: string, amount: string) => `${label}: ${amount} UZS`,
    revenueValue: (amount: string) => `${amount} UZS`,
    ordersValue: (n: number) => `${enN(n)} ${pluralEn(n, ["order", "orders"])}`,
    empty: "No orders in this period",
  },
  recent: {
    title: "Recent orders",
    all: "All",
    table: "Recent orders table",
    columns: {
      number: "№",
      customer: "CUSTOMER",
      date: "DATE",
      total: "TOTAL",
      method: "METHOD",
      status: "STATUS",
    },
    empty: "No orders yet",
  },
  attention: {
    title: "Needs attention",
    empty: "All good for now.",
    btsFailed: (n: number) =>
      `${enN(n)} ${pluralEn(n, ["order was", "orders were"])} not sent to BTS`,
    btsFailedBody: "The automatic attempt failed. Send it by hand.",
    btsPolling: "BTS tracking is down · order statuses are not updating",
    yandex: "Yandex Delivery is not responding · prices and statuses are not updating",
    yandexBody: "Check the balance and the key in the Yandex account; review the open issues.",
    cashbackPolicy: "No cashback policy · purchases earn no cashback",
    cashbackPolicyBody: "Add a new version in the cashback settings.",
    appointments: (n: number) =>
      `${enN(n)} ${pluralEn(n, ["appointment is", "appointments are"])} waiting for confirmation`,
    nextAppointment: (at: string) => `Next: ${at}`,
    review: "Review them",
    refunds: (n: number) =>
      `${enN(n)} ${pluralEn(n, ["refund is", "refunds are"])} waiting for a check`,
    refundsBody: "Review refunds that failed, have an unknown status or must be paid back by hand.",
    billz: (n: number) => `${enN(n)} new ${pluralEn(n, ["product", "products"])} from Billz`,
    billzBody: "Fill in the description and photos, then activate them.",
  },
};

export const dashboardCopy = { uz, ru, en } satisfies CopySet<typeof uz>;
