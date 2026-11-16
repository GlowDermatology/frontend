import type {
  ApiDeliveryOption,
  ApiDeliveryQuote,
  ApiOrderDetail,
} from "@/data/api/customer/account-types";

/**
 * Customer API answers of the Yandex Delivery storefront (plan §3.4), shaped
 * exactly like the backend's `delivery/calculate/` (`with_options`), its
 * checkout refusals and an order detail with a `delivery` object. The
 * storefront itself has no mock mode (its pages answer 404 there); these
 * fixtures pin the mappers and the checkout decisions in the unit tests and
 * document the shapes for a future mock storefront. Times are Tashkent
 * (+05:00) around the demo clock.
 */

export const QUOTE_STANDARD = "6f1c2a7e-3b4d-4c5e-8f90-1a2b3c4d5e6f";
export const QUOTE_EXPRESS = "0a9b8c7d-6e5f-4a3b-9c2d-1e0f2a3b4c5d";
export const QUOTE_STANDARD_FRESH = "11111111-2222-4333-8444-555555555555";

export const standardOption: ApiDeliveryOption = {
  provider: "yandex",
  method: "standard",
  label: "Yandex Standart",
  available: true,
  unavailable_reason: null,
  fee: 28_000,
  eta_from: "2026-11-15T14:30:00+05:00",
  eta_to: "2026-11-15T16:30:00+05:00",
  scheduled: false,
  quote_id: QUOTE_STANDARD,
  expires_at: "2026-11-15T12:15:00+05:00",
  expected_total: 340_000,
};

export const expressOption: ApiDeliveryOption = {
  provider: "yandex",
  method: "express",
  label: "Yandex Ekspress",
  available: true,
  unavailable_reason: null,
  fee: 41_500,
  eta_from: "2026-11-16T09:30:00+05:00",
  eta_to: "2026-11-16T10:30:00+05:00",
  scheduled: true,
  quote_id: QUOTE_EXPRESS,
  expires_at: "2026-11-15T12:15:00+05:00",
  expected_total: 353_500,
};

export const btsOutOfZone: ApiDeliveryOption = {
  provider: "bts",
  method: null,
  label: "BTS pochta",
  available: false,
  unavailable_reason: "out_of_zone",
  fee: null,
  eta_from: null,
  eta_to: null,
  scheduled: false,
  quote_id: null,
  expires_at: null,
  expected_total: null,
};

export const btsAvailable: ApiDeliveryOption = {
  ...btsOutOfZone,
  available: true,
  unavailable_reason: null,
  fee: 25_000,
  expected_total: 337_000,
};

/** `delivery/calculate/` with `with_options`: Standard selected by default. */
export const optionsQuote: ApiDeliveryQuote = {
  fulfilment: "delivery",
  delivery_fee: 28_000,
  region_code: null,
  city_code: null,
  weight_g: 900,
  pickup_address: null,
  quoted_at: "2026-11-15T12:00:00+05:00",
  items_subtotal: 312_000,
  cashback_max: 0,
  cashback_to_use: 0,
  expected_total: 340_000,
  provider: "yandex",
  method: "standard",
  quote_id: QUOTE_STANDARD,
  quote_expires_at: "2026-11-15T12:15:00+05:00",
  options: [standardOption, expressOption, btsOutOfZone],
};

/** The same answer after the customer picked Express. */
export const expressQuote: ApiDeliveryQuote = {
  ...optionsQuote,
  delivery_fee: 41_500,
  expected_total: 353_500,
  method: "express",
  quote_id: QUOTE_EXPRESS,
};

/** An address without a pin and without BTS codes: every option refused (409 `delivery_unavailable`). */
export const deliveryUnavailableDetails = {
  options: [
    {
      ...standardOption,
      available: false,
      unavailable_reason: "coordinates_required",
      fee: null,
      eta_from: null,
      eta_to: null,
      quote_id: null,
      expires_at: null,
      expected_total: null,
    },
    {
      ...expressOption,
      available: false,
      unavailable_reason: "coordinates_required",
      fee: null,
      eta_from: null,
      eta_to: null,
      scheduled: false,
      quote_id: null,
      expires_at: null,
      expected_total: null,
    },
    btsOutOfZone,
  ] satisfies ApiDeliveryOption[],
};

/** 409 `price_changed` of a Yandex checkout whose re-quote gave another fee. */
export const deliveryPriceChangedDetails = {
  total: 345_000,
  items_subtotal: 312_000,
  delivery_fee: 33_000,
  cashback_used: 0,
  cart: {},
  quote_id: QUOTE_STANDARD_FRESH,
  options: [
    { ...standardOption, fee: 33_000, expected_total: 345_000, quote_id: QUOTE_STANDARD_FRESH },
    expressOption,
    btsOutOfZone,
  ] satisfies ApiDeliveryOption[],
};

/** A paid Yandex Express order on its way, as `me/orders/{id}/` answers it. */
export const yandexOrder: ApiOrderDetail = {
  id: 10_311,
  created_at: "2026-11-15T10:02:00+05:00",
  status: "handed_to_courier",
  status_label: "Kuryerga topshirildi",
  fulfilment: "delivery",
  fulfilment_label: "Yetkazib berish",
  total: 353_500,
  item_count: 2,
  preview_images: [],
  preview_thumbnail_images: [],
  payment: {
    status: "paid",
    status_label: "To‘langan",
    provider: "click",
    amount: 353_500,
    confirmed_at: "2026-11-15T10:04:00+05:00",
    in_progress: false,
    in_progress_label: null,
  },
  pay_by: null,
  tracking_number: null,
  delivery: {
    provider: "yandex",
    method: "express",
    method_label: "Ekspress",
    stage: "in_transit",
    stage_label: "Yo‘lda",
    eta_from: "2026-11-15T11:30:00+05:00",
    eta_to: "2026-11-15T12:30:00+05:00",
    courier_name: "Akmal",
    courier_vehicle: "Chevrolet Cobalt, 01 A 123 BC",
    tracking_url: "https://dostavka.yandex.ru/route/abc123",
  },
  items: [],
  items_subtotal: 312_000,
  promo_subtotal: 0,
  delivery_fee: 41_500,
  cashback_used: 0,
  address: "Toshkent, Chilonzor 9-kvartal, 12-uy",
  address_comment: null,
  pickup_address: null,
  customer_note: null,
  refund: null,
  shipment: {
    carrier: "Yandex",
    tracking_number: "",
    tracking_url: "https://dostavka.yandex.ru/route/abc123",
  },
  cashback: { used: 0, earned: 0, earned_state: "none" },
  cancellation: null,
  progress: [
    { step: "placed", label: "Qabul qilindi", state: "done", at: "2026-11-15T10:02:00+05:00" },
    { step: "paid", label: "To‘landi", state: "done", at: "2026-11-15T10:04:00+05:00" },
    { step: "with_courier", label: "Kuryerda", state: "current", at: null },
    { step: "delivered", label: "Yetkazildi", state: "upcoming", at: null },
  ],
  timeline: [
    {
      type: "handed_to_courier",
      at: "2026-11-15T11:20:00+05:00",
      title: "Kuryerga topshirildi",
      subtitle: "Yandex Dostavka",
    },
    {
      type: "shipment_created",
      at: "2026-11-15T11:02:00+05:00",
      title: "Jo‘natma yaratildi",
      subtitle: "Yandex Dostavka",
    },
    {
      type: "payment_confirmed",
      at: "2026-11-15T10:04:00+05:00",
      title: "To‘lov qabul qilindi",
      subtitle: null,
    },
    { type: "order_created", at: "2026-11-15T10:02:00+05:00", title: "Buyurtma", subtitle: null },
  ],
  actions: { pay: false, cancel: false, reorder: true },
};

/** The same order after the recipient could not be reached and the parcel came back. */
export const returnedOrder: ApiOrderDetail = {
  ...yandexOrder,
  delivery: {
    ...yandexOrder.delivery!,
    stage: "returned",
    stage_label: "Do‘konga qaytarildi",
    courier_name: null,
    courier_vehicle: null,
    tracking_url: null,
  },
  shipment: { carrier: "Yandex", tracking_number: "", tracking_url: null },
  timeline: [
    {
      type: "shipment_returned",
      at: "2026-11-15T14:10:00+05:00",
      title: "Buyurtma do‘konga qaytdi",
      subtitle: null,
    },
    {
      type: "delivery_failed",
      at: "2026-11-15T12:40:00+05:00",
      title: "Yetkazib bo‘lmadi",
      subtitle: "Buyurtma do‘konga qaytariladi, biz siz bilan bog‘lanamiz",
    },
    ...yandexOrder.timeline,
  ],
};
