import type { CopySet } from "@/lib/i18n/copy";

/**
 * Product scene words of the data layer (admin contract §2.20): the demo's template names and the
 * refusals and failure messages the mock source answers like the backend (the backend translates
 * its own by `Accept-Language`). Uzbek is the source.
 */
const uz = {
  templates: {
    white: "Oq studiya",
    cream: "Krem gradient",
    marble: "Marmar",
    bathroom: "Hammom javoni",
    spa: "Spa toshlari",
  },
  jobNotFound: "Sahna ishi topilmadi.",
  notReviewable: "Bu natija tayyor emas yoki allaqachon ko‘rib chiqilgan.",
  acknowledge: "Mahsulotning belgilangan qismi AI tomonidan chizilgan: tekshirib, tasdiqlang.",
  templateRequired: "Shablonni tanlang.",
  aiDisabled: "AI sahnalari o‘chirilgan.",
  productCutOff:
    "Mahsulot rasmda to‘liq ko‘rinmayapti (cheti kesilgan). Mahsulotni to‘liq suratga oling.",
};

export const sceneDataCopy = {
  uz,
  ru: {
    templates: {
      white: "Белая студия",
      cream: "Кремовый градиент",
      marble: "Мрамор",
      bathroom: "Полка в ванной",
      spa: "Спа-камни",
    },
    jobNotFound: "Задача сцены не найдена.",
    notReviewable: "Результат ещё не готов или уже рассмотрен.",
    acknowledge: "Отмеченная часть товара нарисована AI: проверьте и подтвердите.",
    templateRequired: "Выберите шаблон.",
    aiDisabled: "AI-сцены выключены.",
    productCutOff:
      "Товар виден на фото не целиком (край обрезан). Сфотографируйте товар полностью.",
  },
  en: {
    templates: {
      white: "White studio",
      cream: "Cream gradient",
      marble: "Marble",
      bathroom: "Bathroom shelf",
      spa: "Spa stones",
    },
    jobNotFound: "Scene job not found.",
    notReviewable: "This result is not ready or has already been reviewed.",
    acknowledge: "The marked part of the product was drawn by AI: check it and confirm.",
    templateRequired: "Choose a template.",
    aiDisabled: "AI scenes are switched off.",
    productCutOff:
      "The product is not whole in the photo (its edge is cut off). Photograph the whole product.",
  },
} satisfies CopySet<typeof uz>;
