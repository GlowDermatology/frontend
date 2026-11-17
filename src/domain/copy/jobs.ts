import { createFormatter, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Background job words (contract §2.14) in uz / ru / en: the screen's own explanation of the two
 * Billz failure codes, the fallback of a failure without a message, and the import summary.
 * Uzbek is the source (the mapper stores it; the import control shows the admin language).
 */
const uzN = createFormatter("uz").number;
const ruN = createFormatter("ru").number;
const enN = createFormatter("en").number;

const uz = {
  listingIncomplete:
    "Billz’dan mahsulotlar ro‘yxati to‘liq kelmadi (yoki shubhali darajada qisqa), shuning uchun hech narsa o‘zgartirilmadi va yashirilmadi. Birozdan so‘ng qayta urinib ko‘ring.",
  authFailed:
    "Billz API kalitni qabul qilmadi, shuning uchun import bajarilmadi. Qayta urinish yordam bermaydi: administrator Billz kalitini tekshirishi kerak.",
  unexpected: "Kutilmagan xato.",
  summary: {
    created: (n: number) => `${uzN(n)} ta yangi`,
    updated: (n: number) => `${uzN(n)} ta yangilandi`,
    unchanged: (n: number) => `${uzN(n)} ta o‘zgarmadi`,
    hidden: (n: number) => `${uzN(n)} ta yashirildi`,
  },
};

export const jobCopy = {
  uz,
  ru: {
    listingIncomplete:
      "Список товаров из Billz пришёл неполным (или подозрительно коротким), поэтому ничего не изменено и не скрыто. Попробуйте ещё раз чуть позже.",
    authFailed:
      "Billz не принял API-ключ, поэтому импорт не выполнен. Повтор не поможет: администратору нужно проверить ключ Billz.",
    unexpected: "Непредвиденная ошибка.",
    summary: {
      created: (n: number) => `${ruN(n)} ${pluralRu(n, ["новый", "новых", "новых"])}`,
      updated: (n: number) => `${ruN(n)} ${pluralRu(n, ["обновлён", "обновлено", "обновлено"])}`,
      unchanged: (n: number) => `${ruN(n)} без изменений`,
      hidden: (n: number) => `${ruN(n)} ${pluralRu(n, ["скрыт", "скрыто", "скрыто"])}`,
    },
  },
  en: {
    listingIncomplete:
      "The product list from Billz arrived incomplete (or suspiciously short), so nothing was changed or hidden. Try again in a little while.",
    authFailed:
      "Billz did not accept the API key, so the import did not run. Retrying will not help: an administrator has to check the Billz key.",
    unexpected: "Unexpected error.",
    summary: {
      created: (n: number) => `${enN(n)} new`,
      updated: (n: number) => `${enN(n)} updated`,
      unchanged: (n: number) => `${enN(n)} unchanged`,
      hidden: (n: number) => `${enN(n)} hidden`,
    },
  },
} satisfies CopySet<typeof uz>;
