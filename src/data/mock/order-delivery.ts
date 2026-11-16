import type { DeliveryIssue } from "@/domain/delivery-issue";
import type {
  DeliveryIssueKind,
  DeliveryMethod,
  OrderDelivery,
  OrderStatus,
  Shipment,
  ShipmentStage,
} from "@/domain/order";

/**
 * Demo Yandex Delivery data (plan §3.10): which generated orders go with a
 * Yandex courier, their carrier view, and the exception queue's rows. Pure:
 * `orders.ts` passes its seeds in and applies the plan, so neither module
 * imports the other's state. The amounts are fixture data (the screens
 * never compute a price).
 */

/** The Yandex half of an order seed. */
export interface YandexSeed {
  method: DeliveryMethod;
  stage: ShipmentStage;
  promisedFrom: string;
  promisedTo: string;
  quoteFee: number;
  carrierPrice: number;
  offerPrice: number | null;
  carrierCostTotal: number | null;
  costDifference: number | null;
  parcelWeightG: number | null;
  preparedAt: string | null;
  courierName: string | null;
  courierVehicle: string | null;
  trackingUrl: string | null;
  claimStatus: string | null;
  claimNumber: number | null;
  failureCode: string | null;
  /** The accepted claim's id (`shipment.tracking_number` of a Yandex order). */
  claimId: string | null;
}

/** What the plan needs of an order seed. */
export interface PlannableSeed {
  id: number;
  at: string;
  status: OrderStatus;
  payment: string;
  fulfilment: string;
  deliveryFee: number;
}

interface IssuePlan {
  kind: DeliveryIssueKind;
  code: string;
  urgent: boolean;
  note?: string;
  /** Ids and amounts; a function reads the order's own Yandex amounts. */
  details?: Record<string, unknown> | ((yandex: YandexSeed) => Record<string, unknown>);
  /** Minutes after the order was placed. */
  openedAfter: number;
  resolved?: { after: number; note: string };
}

interface PlanRow {
  status: OrderStatus;
  method: DeliveryMethod;
  stage: ShipmentStage;
  /**
   * A dispatch whose binding offer went to price review (plan §3.6 step 4):
   * the claim was closed with this code and the offer is `extraOffer` so‘m
   * above the checkout estimate.
   */
  review?: { code: string; extraOffer: number };
  issues?: IssuePlan[];
}

/** Ten demo deliveries, one of every interesting stage, with their issues. */
const PLAN: ReadonlyArray<PlanRow> = [
  {
    status: "processing",
    method: "express",
    stage: "awaiting_dispatch",
    review: { code: "increase_over_limit", extraOffer: 15_000 },
    issues: [
      {
        kind: "dispatch_review",
        code: "increase_over_limit",
        urgent: false,
        openedAfter: 48,
        // The keys the dispatch handler writes (yandex_flow._review), the demo's amounts.
        details: (yandex) => ({
          claim_number: yandex.claimNumber,
          offer_price: yandex.offerPrice,
          estimate_price: yandex.carrierPrice,
          paid_fee: yandex.quoteFee,
          approved_price: null,
          increase: Math.max(0, (yandex.offerPrice ?? 0) - yandex.carrierPrice),
          loss: Math.max(0, (yandex.offerPrice ?? 0) - yandex.quoteFee),
          warnings: [],
        }),
      },
    ],
  },
  {
    status: "processing",
    method: "standard",
    stage: "awaiting_dispatch",
    issues: [
      {
        kind: "preparation_overdue",
        code: "closed",
        urgent: false,
        openedAfter: 125,
        details: { minutes: 120 },
      },
    ],
  },
  { status: "processing", method: "standard", stage: "courier_requested" },
  { status: "processing", method: "express", stage: "courier_assigned" },
  {
    status: "processing",
    method: "standard",
    stage: "failed",
    issues: [
      {
        kind: "dispatch_failed",
        code: "performer_not_found",
        urgent: false,
        openedAfter: 70,
        details: { claim_number: 1 },
      },
    ],
  },
  {
    status: "handed_to_courier",
    method: "express",
    stage: "in_transit",
    issues: [
      {
        kind: "incident",
        code: "staff_report",
        urgent: true,
        note: "Mijoz qo‘ng‘iroq qildi: buyurtmada bitta mahsulot yetishmaydi.",
        openedAfter: 95,
      },
    ],
  },
  { status: "handed_to_courier", method: "standard", stage: "at_destination" },
  {
    status: "handed_to_courier",
    method: "standard",
    stage: "returning",
    issues: [
      {
        kind: "delivery_failed",
        code: "recipient_unreachable",
        urgent: false,
        openedAfter: 150,
        details: { claim_number: 1, carrier_status: "returning" },
      },
      {
        kind: "return_pending",
        code: "warehouse_closed",
        urgent: true,
        openedAfter: 155,
        details: { claim_number: 1 },
      },
    ],
  },
  {
    status: "delivered",
    method: "standard",
    stage: "delivered",
    issues: [
      {
        kind: "incident",
        code: "staff_report",
        urgent: false,
        note: "Qadoq ezilgan holda yetib bordi, mijoz mahsulotni qabul qildi.",
        openedAfter: 300,
        resolved: { after: 340, note: "Mijoz bilan gaplashildi, 10 000 so‘m cashback berildi." },
      },
    ],
  },
  { status: "delivered", method: "express", stage: "delivered" },
];

/** Stages after which a courier claim was accepted (the shipment is `created`). */
const ACCEPTED: ReadonlyArray<ShipmentStage> = [
  "courier_requested",
  "courier_assigned",
  "courier_arrived",
  "in_transit",
  "at_destination",
  "delivered",
  "returning",
  "returned",
];

/** Yandex statuses the demo's claims show, verbatim (plan §1). */
const CLAIM_STATUS: Partial<Record<ShipmentStage, string>> = {
  courier_requested: "performer_lookup",
  courier_assigned: "performer_found",
  courier_arrived: "pickup_arrived",
  in_transit: "pickuped",
  at_destination: "delivery_arrived",
  delivered: "delivered_finish",
  returning: "returning",
  returned: "returned_finish",
  failed: "performer_not_found",
};

const COURIERS: ReadonlyArray<[name: string, vehicle: string]> = [
  ["Sardor", "Chevrolet Cobalt · oq"],
  ["Jasur", "Piyoda kuryer"],
  ["Otabek", "Damas · kulrang"],
  ["Rustam", "Chevrolet Spark · ko‘k"],
];

const COURIER_STAGES: ReadonlyArray<ShipmentStage> = [
  "courier_assigned",
  "courier_arrived",
  "in_transit",
  "at_destination",
];

export const plusMinutes = (iso: string, minutes: number) =>
  `${new Date(new Date(iso).getTime() + minutes * 60_000).toISOString().slice(0, 19)}Z`;

/** Round down to a 500 so‘m step, as the backend's prices are. */
const step500 = (value: number) => Math.floor(value / 500) * 500;

function claimIdOf(orderId: number): string {
  return `${orderId.toString(16)}e4c1d2b7a9f0438e`.slice(0, 16);
}

function yandexSeedFor(row: PlanRow, seed: PlannableSeed, index: number): YandexSeed {
  const express = row.method === "express";
  const paidAt = plusMinutes(seed.at, 3);
  const [from, to] = express ? [45, 90] : [90, 150];
  const accepted = ACCEPTED.includes(row.stage);
  const tried = accepted || row.stage === "failed" || row.review !== undefined;
  const finished = row.stage === "delivered" || row.stage === "returned";
  const carrierPrice = step500(seed.deliveryFee * 0.88);
  const offerPrice = row.review
    ? carrierPrice + row.review.extraOffer
    : tried
      ? carrierPrice + (express ? 1_500 : 500)
      : null;
  const courier =
    COURIER_STAGES.includes(row.stage) || row.stage === "returning"
      ? (COURIERS[index % COURIERS.length] ?? null)
      : null;
  const carrierCostTotal = finished && offerPrice !== null ? offerPrice : null;
  return {
    method: row.method,
    stage: row.stage,
    promisedFrom: plusMinutes(paidAt, from),
    promisedTo: plusMinutes(paidAt, to),
    quoteFee: seed.deliveryFee,
    carrierPrice,
    offerPrice,
    carrierCostTotal,
    // The backend's own figure (fee paid − carrier cost) once the cost is final.
    costDifference: carrierCostTotal !== null ? seed.deliveryFee - carrierCostTotal : null,
    parcelWeightG: tried ? 400 + (seed.id % 5) * 150 : null,
    preparedAt: tried ? plusMinutes(seed.at, 40) : null,
    courierName: courier?.[0] ?? null,
    courierVehicle: courier?.[1] ?? null,
    // A reserved demo host: the real link comes from Yandex's `tracking_url`.
    trackingUrl: accepted && !finished ? `https://example.com/track/${claimIdOf(seed.id)}` : null,
    // A reviewed claim was closed at `ready_for_approval` with the review's code.
    claimStatus: row.review ? "ready_for_approval" : (CLAIM_STATUS[row.stage] ?? null),
    claimNumber: tried ? 1 : null,
    failureCode: row.review
      ? row.review.code
      : row.stage === "failed"
        ? "performer_not_found"
        : null,
    claimId: accepted ? claimIdOf(seed.id) : null,
  };
}

/** The shipment union a Yandex order answers with (claim id as the tracking number). */
export function yandexShipment(yandex: YandexSeed, seed: PlannableSeed): Shipment {
  if (!yandex.claimId) return { state: "not_created", pending: false };
  return {
    state: "created",
    trackingNumber: yandex.claimId,
    tariff: yandex.offerPrice ?? yandex.quoteFee,
    updatedAt: plusMinutes(seed.at, 60),
    via: "polling",
  };
}

export interface YandexPlan {
  deliveries: Map<number, YandexSeed>;
  issues: DeliveryIssue[];
}

const ADMIN = { id: "1", name: "Administrator" };

/**
 * Picks the plan's orders among `candidates` (paid delivery orders, newest
 * first) by status, in order, so the dataset is reproducible, and builds
 * the queue's rows. Issue ids start at 501; a missing candidate skips its row.
 */
export function planYandexDeliveries(candidates: ReadonlyArray<PlannableSeed>): YandexPlan {
  const deliveries = new Map<number, YandexSeed>();
  const issues: DeliveryIssue[] = [];
  const taken = new Set<number>();
  let nextIssueId = 501;
  PLAN.forEach((row, index) => {
    const seed = candidates.find(
      (s) =>
        !taken.has(s.id) &&
        s.status === row.status &&
        s.fulfilment === "delivery" &&
        s.payment === "paid",
    );
    if (!seed) return;
    taken.add(seed.id);
    const yandex = yandexSeedFor(row, seed, index);
    deliveries.set(seed.id, yandex);
    for (const issue of row.issues ?? []) {
      const openedAt = plusMinutes(seed.at, issue.openedAfter);
      const resolvedAt = issue.resolved ? plusMinutes(seed.at, issue.resolved.after) : null;
      issues.push({
        id: nextIssueId++,
        orderId: seed.id,
        kind: issue.kind,
        code: issue.code,
        urgent: issue.urgent,
        details:
          typeof issue.details === "function" ? issue.details(yandex) : (issue.details ?? {}),
        note: issue.note ?? "",
        state: issue.resolved ? "resolved" : "open",
        openedAt,
        updatedAt: resolvedAt ?? openedAt,
        remindedAt: issue.urgent && !issue.resolved ? plusMinutes(openedAt, 30) : null,
        reminders: issue.urgent && !issue.resolved ? 1 : 0,
        resolvedAt,
        resolvedBy: issue.resolved ? ADMIN : null,
        resolutionNote: issue.resolved?.note ?? "",
      });
    }
  });
  return { deliveries, issues };
}

/** The carrier view of a delivery order (BTS: provider and open issues only). */
export function deliveryView(
  fulfilment: string,
  yandex: YandexSeed | undefined,
  issues: ReadonlyArray<DeliveryIssue>,
): OrderDelivery | null {
  if (fulfilment !== "delivery") return null;
  const openIssues = issues
    .filter((issue) => issue.state === "open")
    .sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.openedAt.localeCompare(b.openedAt))
    .map((issue) => ({
      id: issue.id,
      kind: issue.kind,
      code: issue.code,
      urgent: issue.urgent,
      openedAt: issue.openedAt,
    }));
  const empty = {
    method: null,
    stage: null,
    promisedFrom: null,
    promisedTo: null,
    quoteFee: null,
    carrierPrice: null,
    offerPrice: null,
    approvedPrice: null,
    carrierCostTotal: null,
    costDifference: null,
    parcelWeightG: null,
    preparedAt: null,
    courierName: null,
    courierVehicle: null,
    trackingUrl: null,
    claimStatus: null,
    claimNumber: null,
    failureCode: null,
  };
  if (!yandex) return { provider: "bts", ...empty, openIssues };
  return {
    provider: "yandex",
    method: yandex.method,
    stage: yandex.stage,
    promisedFrom: yandex.promisedFrom,
    promisedTo: yandex.promisedTo,
    quoteFee: yandex.quoteFee,
    carrierPrice: yandex.carrierPrice,
    offerPrice: yandex.offerPrice,
    approvedPrice: null,
    carrierCostTotal: yandex.carrierCostTotal,
    costDifference: yandex.costDifference,
    parcelWeightG: yandex.parcelWeightG,
    preparedAt: yandex.preparedAt,
    courierName: yandex.courierName,
    courierVehicle: yandex.courierVehicle,
    trackingUrl: yandex.trackingUrl,
    claimStatus: yandex.claimStatus,
    claimNumber: yandex.claimNumber,
    failureCode: yandex.failureCode,
    openIssues,
  };
}

/** Issues a new dispatch resolves (the backend's `DISPATCH_RESOLVES`). */
const DISPATCH_RESOLVES: ReadonlyArray<DeliveryIssueKind> = [
  "dispatch_failed",
  "dispatch_review",
  "preparation_overdue",
];

export interface DemoDispatch {
  orderId: number;
  method: DeliveryMethod;
  weightG: number;
  approvedPrice: number | null;
  at: string;
}

/** The demo claim id of an order's `claimNumber`-th courier claim. */
export function demoClaimId(orderId: number, claimNumber: number): string {
  const id = claimIdOf(orderId);
  return claimNumber > 1 ? `${id.slice(0, 15)}${claimNumber % 10}` : id;
}

/**
 * The demo's answer to "Kuryer chaqirish": there is no outbox and no courier,
 * so the next claim is accepted and a courier assigned at once (with the API
 * the dispatch answers 202 at `courier_requested` and the screen polls). The
 * order's dispatch issues are resolved, as the backend does.
 */
export function demoDispatched(delivery: OrderDelivery, input: DemoDispatch): OrderDelivery {
  const [courierName, courierVehicle] = COURIERS[input.orderId % COURIERS.length]!;
  const claimNumber = (delivery.claimNumber ?? 0) + 1;
  return {
    ...delivery,
    method: input.method,
    stage: "courier_assigned",
    // Fixture amounts: an approved offer, else the checkout estimate.
    offerPrice: input.approvedPrice ?? delivery.carrierPrice,
    approvedPrice: input.approvedPrice,
    parcelWeightG: input.weightG,
    preparedAt: input.at,
    courierName,
    courierVehicle,
    trackingUrl: `https://example.com/track/${demoClaimId(input.orderId, claimNumber)}`,
    claimStatus: "performer_found",
    claimNumber,
    failureCode: null,
    openIssues: delivery.openIssues.filter((issue) => !DISPATCH_RESOLVES.includes(issue.kind)),
  };
}

/** Staff confirmed the parcel is back: stage `returned`, the `return_pending` issue resolved. */
export function demoReturnConfirmed(delivery: OrderDelivery): OrderDelivery {
  return {
    ...delivery,
    stage: "returned",
    trackingUrl: null,
    courierName: null,
    courierVehicle: null,
    openIssues: delivery.openIssues.filter((issue) => issue.kind !== "return_pending"),
  };
}

/** A resolved demo incident on a BTS order (the queue's "Hal qilingan" tab is not empty). */
export function btsIncident(seed: PlannableSeed, id: number): DeliveryIssue {
  const openedAt = plusMinutes(seed.at, 26 * 60 + 30);
  const resolvedAt = plusMinutes(openedAt, 45);
  return {
    id,
    orderId: seed.id,
    kind: "incident",
    code: "staff_report",
    urgent: false,
    details: {},
    note: "Mijoz boshqa rangdagi mahsulot kelganini aytdi.",
    state: "resolved",
    openedAt,
    updatedAt: resolvedAt,
    remindedAt: null,
    reminders: 0,
    resolvedAt,
    resolvedBy: ADMIN,
    resolutionNote: "Do‘konda almashtirib berildi.",
  };
}
