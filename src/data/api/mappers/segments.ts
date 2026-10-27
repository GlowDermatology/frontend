import type { Segment, SegmentMember } from "@/domain/segment";

import type { SegmentFormValues } from "../../segments.schema";
import type { ApiCustomerListItem, ApiSegment, ApiSegmentPatch, ApiSegmentWrite } from "../types";
import { idString, customerContact } from "./common";
import { DELETED_CUSTOMER_NAME } from "./appointments";

/** `Segment` (contract §2.8) → the FE domain type. */
export function mapSegment(api: ApiSegment): Segment {
  return {
    id: idString(api.id),
    name: api.name,
    rules: {
      minOnlineOrders: api.rules.min_online_orders ?? null,
      minLifetimeAmount: api.rules.min_lifetime_amount ?? null,
    },
    manualMemberCount: api.manual_member_count,
    memberCount: api.member_count,
    size: api.size,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/** `CustomerListItem` (contract §2.6) → a member row; a scrubbed name shows as deleted. */
export function mapSegmentMember(api: ApiCustomerListItem): SegmentMember {
  return {
    id: idString(api.id),
    name: api.name || DELETED_CUSTOMER_NAME,
    phone: customerContact(api.phone, api.email),
    status: api.status,
    registeredAt: api.registered_at,
    lifetimeTotal: api.lifetime_total,
    percent: api.percent,
    balance: api.balance,
    onlineOrdersCount: api.online_orders_count,
  };
}

/** Body of `POST segments/`: the name and both rules (`null` = off). */
export function segmentCreateBody(values: SegmentFormValues): ApiSegmentWrite {
  return {
    name: values.name,
    rules: {
      min_online_orders: values.rules.minOnlineOrders,
      min_lifetime_amount: values.rules.minLifetimeAmount,
    },
  };
}

/**
 * Body of `PATCH segments/{id}/`: only what differs from the group the dialog
 * loaded (`baseline`). `rules` carries only the changed rule(s), so another
 * admin's concurrent change to the other rule survives. May be empty.
 */
export function segmentPatchBody(
  baseline: SegmentFormValues,
  values: SegmentFormValues,
): ApiSegmentPatch {
  const body: ApiSegmentPatch = {};
  if (values.name !== baseline.name) body.name = values.name;
  const rules: NonNullable<ApiSegmentPatch["rules"]> = {};
  if (values.rules.minOnlineOrders !== baseline.rules.minOnlineOrders) {
    rules.min_online_orders = values.rules.minOnlineOrders;
  }
  if (values.rules.minLifetimeAmount !== baseline.rules.minLifetimeAmount) {
    rules.min_lifetime_amount = values.rules.minLifetimeAmount;
  }
  if (Object.keys(rules).length > 0) body.rules = rules;
  return body;
}
