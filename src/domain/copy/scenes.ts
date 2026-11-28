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
  customName: "O‘z sahnasi",
  customRequired: "Sahnani tasvirlang (3–400 belgi).",
  customRefused:
    "Bu tavsif bo‘yicha sahna yaratib bo‘lmaydi: unda odamlar, qo‘llar, yozuv yoki brend bo‘lmasligi kerak. Faqat fon va atrofni tasvirlang.",
  notCustom: "Faqat o‘zingiz yozgan, tayyor sahnani shablon sifatida saqlash mumkin.",
  templateExists: "Bu sahna allaqachon shablon sifatida saqlangan.",
  templateName: "Shablon nomini yozing (60 belgigacha).",
  bannerPhotoUnusable:
    "Mahsulot rasmidan foydalanib bo‘lmadi (mahsulot to‘liq ko‘rinmaydi yoki uni qo‘l yopib turibdi). Boshqa mahsulotni tanlang yoki uning asosiy rasmini almashtiring.",
  bannerProducts: "1 tadan 3 tagacha mahsulot tanlang.",
  studioColours: "Studiya shablonining ranglari ops konsolida o‘zgartiriladi.",
  templateNeedsText: "Rasmni yaratish uchun shablonga sahna tavsifini yozing.",
  templateScene: "Sahnani tasvirlang yoki namuna rasm yuklang.",
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
    customName: "Своя сцена",
    customRequired: "Опишите сцену (3–400 символов).",
    customRefused:
      "По этому описанию сцену создать нельзя: в ней не должно быть людей, рук, надписей или брендов. Опишите только фон и окружение.",
    notCustom: "Сохранить как шаблон можно только готовую сцену, которую вы описали сами.",
    templateExists: "Эта сцена уже сохранена как шаблон.",
    templateName: "Введите название шаблона (до 60 символов).",
    bannerPhotoUnusable:
      "Фото товара не подошло (товар виден не целиком или его закрывает рука). Выберите другой товар или замените его главное фото.",
    bannerProducts: "Выберите от 1 до 3 товаров.",
    studioColours: "Цвета студийного шаблона меняются в ops-консоли.",
    templateNeedsText: "Чтобы создать изображение, опишите сцену шаблона.",
    templateScene: "Опишите сцену или загрузите образец.",
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
    customName: "Custom scene",
    customRequired: "Describe the scene (3–400 characters).",
    customRefused:
      "A scene can't be made from this description: it must not contain people, hands, text or brands. Describe only the background and surroundings.",
    notCustom: "Only a finished scene you described yourself can be saved as a template.",
    templateExists: "This scene is already saved as a template.",
    templateName: "Enter the template's name (up to 60 characters).",
    bannerPhotoUnusable:
      "A product's photo could not be used (the product is not fully in the frame or a hand covers it). Choose another product or replace its main photo.",
    bannerProducts: "Choose 1 to 3 products.",
    studioColours: "A studio template's colours are changed in the ops console.",
    templateNeedsText: "Describe the template's scene to create its picture.",
    templateScene: "Describe the scene or upload a reference picture.",
  },
} satisfies CopySet<typeof uz>;
