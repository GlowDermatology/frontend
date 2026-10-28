import "server-only";

import { apiAddresses, apiMe, apiSessions } from "@/data/api/customer/account";
import {
  mapAddress,
  mapAppointment,
  mapCart,
  mapCashback,
  mapInboxItem,
  mapLedgerItem,
  mapMe,
  mapOrder,
  mapOrderSummary,
  mapPage,
  mapRegions,
  mapSession,
  orderSessions,
} from "@/data/api/customer/account-mappers";
import {
  apiAppointments,
  apiCart,
  apiCashback,
  apiInbox,
  apiLedger,
  apiOrder,
  apiOrders,
  apiRegions,
} from "@/data/api/customer/commerce";
import { isApiError } from "@/data/api/errors";
import type { ShopPage } from "@/domain/shop";
import type {
  ShopAddress,
  ShopAppointment,
  ShopCart,
  ShopCashback,
  ShopInboxItem,
  ShopLedgerItem,
  ShopMe,
  ShopOrder,
  ShopOrderSummary,
  ShopRegion,
  ShopSession,
} from "@/domain/shop-account";
import { serverEnv } from "@/lib/env.server";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Reads of the private storefront pages (request-bound, never cached: each
 * answer belongs to one customer). Wrap them in `privateRead(next, …)` from
 * `./private` so a revoked session goes through the refresh route.
 */

export type OrderScope = "active" | "completed" | "cancelled" | "all";
export type AppointmentScope = "upcoming" | "past";

export async function getMe(locale: Locale): Promise<ShopMe> {
  return mapMe((await apiMe(locale)).data);
}

export async function getAddresses(locale: Locale): Promise<ShopAddress[]> {
  return (await apiAddresses(locale)).data.results.map(mapAddress);
}

export async function getSessions(locale: Locale): Promise<ShopSession[]> {
  const page = (await apiSessions(locale)).data;
  return orderSessions(page.results.map(mapSession));
}

export async function getCart(locale: Locale): Promise<ShopCart> {
  return mapCart((await apiCart(locale)).data, serverEnv.mediaHosts());
}

/** BTS regions for the address form; `[]` while delivery is not offered (contract §2.6). */
export async function getRegions(locale: Locale): Promise<ShopRegion[]> {
  return mapRegions((await apiRegions(locale)).data);
}

export async function getOrders(
  locale: Locale,
  scope: OrderScope,
  page: number,
): Promise<ShopPage<ShopOrderSummary>> {
  const hosts = serverEnv.mediaHosts();
  const data = (await apiOrders(locale, { page, scope })).data;
  return mapPage(data, (item) => mapOrderSummary(item, hosts));
}

/** One order, or `null` for another customer's or an unknown id (404, §1.6). */
export async function getOrder(locale: Locale, id: number): Promise<ShopOrder | null> {
  try {
    return mapOrder((await apiOrder(locale, id)).data, serverEnv.mediaHosts());
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

export async function getCashback(locale: Locale): Promise<ShopCashback> {
  return mapCashback((await apiCashback(locale)).data);
}

export async function getLedger(locale: Locale, page: number): Promise<ShopPage<ShopLedgerItem>> {
  return mapPage((await apiLedger(locale, page)).data, mapLedgerItem);
}

export async function getAppointments(
  locale: Locale,
  scope: AppointmentScope,
  page: number,
): Promise<ShopPage<ShopAppointment>> {
  const hosts = serverEnv.mediaHosts();
  const data = (await apiAppointments(locale, scope, page)).data;
  return mapPage(data, (item) => mapAppointment(item, hosts));
}

export async function getInbox(
  locale: Locale,
  page: number,
): Promise<{ page: ShopPage<ShopInboxItem>; unread: number }> {
  const hosts = serverEnv.mediaHosts();
  const data = (await apiInbox(locale, page)).data;
  return {
    page: mapPage(data, (item) => mapInboxItem(item, hosts)),
    unread: Math.max(0, data.unread_count ?? 0),
  };
}
