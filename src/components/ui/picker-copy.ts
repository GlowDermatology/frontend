import type { CopySet } from "@/lib/i18n/copy";

/**
 * Texts of the date, time and phone pickers (`calendar.tsx`, `date-picker.tsx`,
 * `time-picker.tsx`, `date-time-picker.tsx`, `date-range-picker.tsx`,
 * `phone-input.tsx`). Uzbek is the source. Month and weekday names are kept
 * here rather than taken from `Intl` (whose `uz` data differs between Node
 * and browsers).
 */
const uz = {
  /** Calendar header ("Noyabr 2026"). */
  months: [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ],
  /** Month buttons of the month view. */
  monthsShort: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
  /** Column heads, Monday first. */
  weekdaysShort: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
  /** Column heads' full names (`abbr`), Monday first. */
  weekdays: ["dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba"],
  /** A day button's accessible name ("17-noyabr 2026, seshanba"). */
  dayLabel: (day: number, monthIndex: number, year: number, weekdayIndex: number) =>
    `${day}-${uz.months[monthIndex]!.toLowerCase()} ${year}, ${uz.weekdays[weekdayIndex]}`,
  /** The header in a sentence ("Noyabr 2026"). */
  monthTitle: (monthIndex: number, year: number) => `${uz.months[monthIndex]} ${year}`,
  previousMonth: "Oldingi oy",
  nextMonth: "Keyingi oy",
  previousYear: "Oldingi yil",
  nextYear: "Keyingi yil",
  previousYears: "Oldingi yillar",
  nextYears: "Keyingi yillar",
  chooseMonth: "Oy va yilni tanlash",
  chooseYear: "Yilni tanlash",
  calendar: "Kalendar",
  keyboardHint:
    "Strelkalar — kunlar, Page Up / Page Down — oylar, Shift bilan — yillar, Enter — tanlash, Esc — yopish.",
  today: "Bugun",
  now: "Hozir",
  clear: "Tozalash",
  done: "Tayyor",
  openCalendar: "Kalendarni ochish",
  openTimes: "Vaqtlar ro‘yxatini ochish",
  /** The icon buttons named after their field ("Kalendarni ochish: Dan"). */
  openCalendarFor: (field: string) => `Kalendarni ochish: ${field}`,
  openTimesFor: (field: string) => `Vaqtlar ro‘yxatini ochish: ${field}`,
  unavailable: "tanlab bo‘lmaydi",
  /** Placeholders show the expected shape. */
  datePlaceholder: "kk.oo.yyyy",
  timePlaceholder: "ss:dd",
  dateTimePlaceholder: "kk.oo.yyyy ss:dd",
  /** Announced when a typed value is left unreadable. */
  invalidDate: "Sana tushunarsiz: kk.oo.yyyy ko‘rinishida kiriting, masalan 17.11.2026.",
  invalidTime: "Vaqt tushunarsiz: ss:dd ko‘rinishida kiriting, masalan 09:30.",
  invalidDateTime: "Sana va vaqt tushunarsiz: masalan 17.11.2026 09:30 ko‘rinishida kiriting.",
  outOfRange: "Bu sanani tanlab bo‘lmaydi, boshqasini tanlang.",
  /** Announced after a value is set from the popover ("Tanlandi: 17.11.2026"). */
  selected: (value: string) => `Tanlandi: ${value}`,
  timePanel: "Vaqt",
  hours: "Soat",
  minutes: "Daqiqa",
  /** The range picker. */
  range: {
    group: "Sana oralig‘i",
    from: "Sanadan",
    to: "Sanagacha",
    toShort: "gacha",
    presets: "Tez tanlash",
    today: "Bugun",
    yesterday: "Kecha",
    last7: "Oxirgi 7 kun",
    last30: "Oxirgi 30 kun",
    thisMonth: "Shu oy",
    lastMonth: "O‘tgan oy",
  },
  /** The phone input. */
  phone: {
    countryCode: "Mamlakat kodi +998",
  },
};

const ru = {
  months: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  monthsShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
  weekdaysShort: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  weekdays: ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"],
  dayLabel: (day: number, monthIndex: number, year: number, weekdayIndex: number) =>
    `${day} ${RU_MONTHS_GENITIVE[monthIndex]} ${year}, ${ru.weekdays[weekdayIndex]}`,
  monthTitle: (monthIndex: number, year: number) => `${ru.months[monthIndex]} ${year}`,
  previousMonth: "Предыдущий месяц",
  nextMonth: "Следующий месяц",
  previousYear: "Предыдущий год",
  nextYear: "Следующий год",
  previousYears: "Предыдущие годы",
  nextYears: "Следующие годы",
  chooseMonth: "Выбрать месяц и год",
  chooseYear: "Выбрать год",
  calendar: "Календарь",
  keyboardHint:
    "Стрелки — дни, Page Up / Page Down — месяцы, с Shift — годы, Enter — выбрать, Esc — закрыть.",
  today: "Сегодня",
  now: "Сейчас",
  clear: "Очистить",
  done: "Готово",
  openCalendar: "Открыть календарь",
  openTimes: "Открыть список времени",
  openCalendarFor: (field: string) => `Открыть календарь: ${field}`,
  openTimesFor: (field: string) => `Открыть список времени: ${field}`,
  unavailable: "недоступно",
  datePlaceholder: "дд.мм.гггг",
  timePlaceholder: "чч:мм",
  dateTimePlaceholder: "дд.мм.гггг чч:мм",
  invalidDate: "Дата не распознана: введите в виде дд.мм.гггг, например 17.11.2026.",
  invalidTime: "Время не распознано: введите в виде чч:мм, например 09:30.",
  invalidDateTime: "Дата и время не распознаны: введите, например, 17.11.2026 09:30.",
  outOfRange: "Эту дату выбрать нельзя, выберите другую.",
  selected: (value: string) => `Выбрано: ${value}`,
  timePanel: "Время",
  hours: "Часы",
  minutes: "Минуты",
  range: {
    group: "Период",
    from: "С даты",
    to: "По дату",
    toShort: "по",
    presets: "Быстрый выбор",
    today: "Сегодня",
    yesterday: "Вчера",
    last7: "Последние 7 дней",
    last30: "Последние 30 дней",
    thisMonth: "Этот месяц",
    lastMonth: "Прошлый месяц",
  },
  phone: {
    countryCode: "Код страны +998",
  },
};

const RU_MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const en = {
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  weekdaysShort: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  dayLabel: (day: number, monthIndex: number, year: number, weekdayIndex: number) =>
    `${en.weekdays[weekdayIndex]}, ${day} ${en.months[monthIndex]} ${year}`,
  monthTitle: (monthIndex: number, year: number) => `${en.months[monthIndex]} ${year}`,
  previousMonth: "Previous month",
  nextMonth: "Next month",
  previousYear: "Previous year",
  nextYear: "Next year",
  previousYears: "Earlier years",
  nextYears: "Later years",
  chooseMonth: "Choose month and year",
  chooseYear: "Choose year",
  calendar: "Calendar",
  keyboardHint:
    "Arrows move by day, Page Up / Page Down by month, with Shift by year, Enter selects, Esc closes.",
  today: "Today",
  now: "Now",
  clear: "Clear",
  done: "Done",
  openCalendar: "Open calendar",
  openTimes: "Open the list of times",
  openCalendarFor: (field: string) => `Open calendar: ${field}`,
  openTimesFor: (field: string) => `Open the list of times: ${field}`,
  unavailable: "unavailable",
  datePlaceholder: "dd.mm.yyyy",
  timePlaceholder: "hh:mm",
  dateTimePlaceholder: "dd.mm.yyyy hh:mm",
  invalidDate: "Date not recognised: enter it as dd.mm.yyyy, for example 17.11.2026.",
  invalidTime: "Time not recognised: enter it as hh:mm, for example 09:30.",
  invalidDateTime: "Date and time not recognised: enter, for example, 17.11.2026 09:30.",
  outOfRange: "This date cannot be chosen; pick another one.",
  selected: (value: string) => `Selected: ${value}`,
  timePanel: "Time",
  hours: "Hours",
  minutes: "Minutes",
  range: {
    group: "Date range",
    from: "From",
    to: "To",
    toShort: "to",
    presets: "Quick picks",
    today: "Today",
    yesterday: "Yesterday",
    last7: "Last 7 days",
    last30: "Last 30 days",
    thisMonth: "This month",
    lastMonth: "Last month",
  },
  phone: {
    countryCode: "Country code +998",
  },
};

export const pickerCopy = { uz, ru, en } satisfies CopySet<typeof uz>;

export type PickerCopy = (typeof pickerCopy)["uz"];
