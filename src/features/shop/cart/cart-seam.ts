/**
 * The add-to-cart seam between W3a's product page and W3b's server cart.
 *
 * W3b replaces `addToCart` with a call to its Server Action through
 * `runShopAction(locale, (csrf) => addCartItem(productId, quantity, key, csrf))`
 * (`POST cart/items/` with an idempotency key per tap, contract §2.5) and maps
 * the result to these outcomes. Until then the storefront has no cart, so
 * the button reports `not_ready` and the island routes to the cart (or
 * sign-in) placeholder page.
 */

export type AddToCartOutcome =
  | { kind: "added"; lineQuantity: number; cartLines: number }
  | { kind: "sign_in_required" }
  | { kind: "unavailable"; message: string }
  | { kind: "not_ready" };

export async function addToCart(productId: number, quantity: number): Promise<AddToCartOutcome> {
  void productId;
  void quantity;
  return { kind: "not_ready" };
}
