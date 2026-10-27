import "server-only";

import { apiCustomerRefresh } from "@/data/api/customer/auth";
import type { CustomerDevice } from "@/data/api/customer/client";
import { isApiError } from "@/data/api/errors";
import type { Locale } from "@/lib/i18n/locales";

import { createRefreshCoordinator, type CustomerRefreshOutcome } from "./refresh";

/**
 * The process-wide single-flight refresh (`./refresh.ts`). Every caller —
 * the refresh route and the client plumbing of the Server Actions — goes through
 * `refreshCustomerSession`, so two requests carrying the same refresh
 * cookie never rotate it twice.
 */
const coordinator = createRefreshCoordinator();

export function refreshCustomerSession(input: {
  refresh: string;
  device: CustomerDevice | undefined;
  locale: Locale;
  requestHeaders: Pick<Headers, "get">;
}): Promise<CustomerRefreshOutcome> {
  return coordinator.refresh(
    input.refresh,
    async (token) => {
      try {
        const response = await apiCustomerRefresh({ ...input, refresh: token });
        return { status: response.status, body: response.data };
      } catch (error) {
        if (!isApiError(error)) throw error;
        return { status: error.status, body: error.body, retryAfter: error.retryAfter };
      }
    },
    input.device?.id ?? "",
  );
}

/** Drops a remembered rotation of `refresh` (after a logout with it). */
export function forgetCustomerRefresh(refresh: string): void {
  coordinator.forget(refresh);
}
