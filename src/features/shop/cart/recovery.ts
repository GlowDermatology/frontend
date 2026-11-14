import type { ShopCart, ShopOrder } from "@/domain/shop-account";

export function cartBadgeQuantity(cart: ShopCart): number {
  const order = cart.checkoutOrder;
  return (
    cart.quantityTotal +
    (order?.status === "awaiting_payment"
      ? order.items.reduce((total, item) => total + item.quantity, 0)
      : 0)
  );
}

export function recoveryPhase(order: ShopOrder, now: number) {
  if (order.payment.inProgress) return "confirming";
  if (
    order.cancellation?.reason === "reservation_expired" ||
    (order.status === "awaiting_payment" && order.payBy && Date.parse(order.payBy) <= now)
  )
    return "expired";
  return order.status === "cancelled" ? "cancelled" : "pending";
}
