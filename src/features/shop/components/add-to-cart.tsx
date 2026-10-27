"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n/locales";

import { addToCart } from "../cart/cart-seam";
import { shopHref } from "../routing/routes";
import { hasSignedInHint } from "../shared/action-client";

export type AddToCartState = "available" | "sold_out" | "sales_off";

interface AddToCartProps {
  locale: Locale;
  productId: number;
  /** This product page, for the sign-in page's `next`. */
  productPath: string;
  state: AddToCartState;
  labels: { add: string; soldOut: string; salesOff: string };
}

/**
 * "Savatga qo‘shish" — the product page's only client island. It calls the
 * cart seam (`../cart/cart-seam.ts`); while the seam answers `not_ready`
 * (W3a), a signed-out visitor goes to the sign-in page and a signed-in one
 * to the cart page, both with this product as `next`.
 */
export function AddToCart({ locale, productId, productPath, state, labels }: AddToCartProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

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
    setMessage(null);
    startTransition(async () => {
      const outcome = await addToCart(productId, 1);
      if (outcome.kind === "added") {
        router.refresh();
        return;
      }
      if (outcome.kind === "unavailable") {
        setMessage(outcome.message);
        return;
      }
      const signIn = outcome.kind === "sign_in_required" || !hasSignedInHint();
      router.push(shopHref(locale, { kind: signIn ? "signIn" : "cart" }, { next: productPath }));
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
      <p role="status" className="m-0 min-h-5 text-body-sm text-danger-strong">
        {message}
      </p>
    </div>
  );
}
