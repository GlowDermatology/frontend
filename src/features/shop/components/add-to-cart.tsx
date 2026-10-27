"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import type { Locale } from "@/lib/i18n/locales";

import { useShopSession } from "../account/session-context";
import { addToCart } from "../cart/cart-seam";
import { ordersCopy } from "../copy/orders";
import { shopHref, shopPath } from "../routing/routes";

export type AddToCartState = "available" | "sold_out" | "sales_off";

interface AddToCartProps {
  locale: Locale;
  productId: number;
  /** This product page, for the sign-in page's `next`. */
  productPath: string;
  state: AddToCartState;
  labels: { add: string; soldOut: string; salesOff: string };
}

type Feedback =
  | { kind: "added"; lineQuantity: number; maxReached: boolean }
  | { kind: "error"; message: string }
  | null;

/**
 * "Savatga qo‘shish" — the product page's client island: `POST cart/items/`
 * with one idempotency key per tap (`cart-seam.ts`). A visitor without a
 * session goes to sign in and comes back here; a success updates the
 * header's bag badge and offers the way to the cart.
 */
export function AddToCart({ locale, productId, productPath, state, labels }: AddToCartProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const key = useIdempotencyKey();
  const { setCartQuantity } = useShopSession();
  const copy = ordersCopy[locale].addToCart;

  if (state !== "available") {
    return (
      <div className="flex flex-col gap-3">
        <Button size="xl" disabled className="w-full sm:w-auto sm:min-w-[280px]">
          {labels.soldOut}
        </Button>
        {state === "sales_off" ? (
          <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">{labels.salesOff}</p>
        ) : null}
      </div>
    );
  }

  const onClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const outcome = await addToCart({ locale, productId, quantity: 1, idempotencyKey: key.key });
      if (outcome.kind === "added") {
        key.renew();
        setCartQuantity(outcome.cartQuantity);
        setFeedback({
          kind: "added",
          lineQuantity: outcome.lineQuantity,
          maxReached: outcome.maxReached,
        });
        return;
      }
      if (outcome.kind === "unavailable") {
        if (outcome.code === "idempotency_key_reused") key.renew();
        setFeedback({ kind: "error", message: outcome.message });
        return;
      }
      router.push(shopHref(locale, { kind: "signIn" }, { next: productPath }));
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="xl"
        lift
        onClick={onClick}
        disabled={pending}
        aria-busy={pending || undefined}
        className="w-full gap-2.5 sm:w-auto sm:min-w-[280px]"
      >
        <Icon name="bag" size={20} />
        {labels.add}
      </Button>
      <div role="status" className="min-h-5">
        {feedback?.kind === "added" ? (
          <div className="flex animate-rise-in flex-col gap-2 rounded-md border border-line bg-surface-raised p-4 sm:max-w-[420px]">
            <p className="m-0 flex items-center gap-2 text-label text-ink">
              <span className="flex size-6 items-center justify-center rounded-full bg-success-soft text-success">
                <Icon name="check" size={14} strokeWidth={2.2} />
              </span>
              {copy.added}
              <span className="font-normal text-ink-muted">
                · {copy.inCart(feedback.lineQuantity)}
              </span>
            </p>
            {feedback.maxReached ? (
              <p className="m-0 text-body-sm text-ink-muted">{copy.maxReached}</p>
            ) : null}
            <Link
              href={shopPath(locale, { kind: "cart" })}
              className={buttonStyles({
                variant: "secondary",
                size: "sm",
                className: "self-start",
              })}
            >
              {copy.viewCart}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        ) : feedback?.kind === "error" ? (
          <p className="m-0 text-body-sm font-semibold text-danger-strong">{feedback.message}</p>
        ) : null}
      </div>
    </div>
  );
}
