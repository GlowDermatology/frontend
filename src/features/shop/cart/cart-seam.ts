import { addCartItem } from "@/data/shop/commerce.actions";
import type { Locale } from "@/lib/i18n/locales";

import { hasSignedInHint, runShopAction } from "../shared/action-client";

/**
 * Add to cart from a product page: `POST cart/items/` (contract §2.5) with
 * one idempotency key per tap, through `runShopAction` (csrf, one refresh
 * and retry). A visitor without a session is sent to sign in first.
 */

export type AddToCartOutcome =
  | { kind: "added"; lineQuantity: number; cartQuantity: number; maxReached: boolean }
  | { kind: "sign_in_required" }
  | { kind: "unavailable"; message: string; code: string };

export async function addToCart(input: {
  locale: Locale;
  productId: number;
  quantity: number;
  idempotencyKey: string;
}): Promise<AddToCartOutcome> {
  if (!hasSignedInHint()) return { kind: "sign_in_required" };
  const result = await runShopAction(input.locale, (csrf) =>
    addCartItem({
      locale: input.locale,
      productId: input.productId,
      quantity: input.quantity,
      idempotencyKey: input.idempotencyKey,
      csrf,
    }),
  );
  if (result.ok) {
    const line = result.data.lines.find((item) => item.productId === input.productId);
    return {
      kind: "added",
      lineQuantity: line?.quantity ?? input.quantity,
      cartQuantity: result.data.quantityTotal,
      maxReached: result.data.lastChange?.maxReached ?? false,
    };
  }
  if (result.code === "session_expired") return { kind: "sign_in_required" };
  return { kind: "unavailable", message: result.error, code: result.code ?? "unexpected" };
}
