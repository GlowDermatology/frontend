"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { cancelOrder, reorder, startPayment } from "@/data/shop/commerce.actions";
import type { PaymentProvider } from "@/domain/shop-account";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import type { Locale } from "@/lib/i18n/locales";

import { FormAlert, FormNote } from "../account/controls";
import { PhoneGate } from "../account/phone-gate";
import { useShopSession } from "../account/session-context";
import { failureText, useShopAction } from "../account/use-shop-action";
import { ordersCopy } from "../copy/orders";
import { shopPath } from "../routing/routes";

/**
 * The order page's commands (`actions` of `OrderDetail`, contract §2.8):
 * pay (the provider page; the other provider while none is in flight),
 * cancel an unpaid order (confirmation), order again (the lines go back to
 * the cart). Payment runs through the phone gate like checkout.
 */
export function OrderActions({
  locale,
  orderId,
  provider,
  actions,
  providers,
}: {
  locale: Locale;
  orderId: number;
  provider: PaymentProvider;
  actions: { pay: boolean; cancel: boolean; reorder: boolean };
  providers: ReadonlyArray<PaymentProvider>;
}) {
  const copy = ordersCopy[locale].order;
  const router = useRouter();
  const { run, pending, error } = useShopAction(locale);
  const payKey = useIdempotencyKey();
  const cancelKey = useIdempotencyKey();
  const reorderKey = useIdempotencyKey();
  const { setCartQuantity } = useShopSession();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [gate, setGate] = useState<PaymentProvider | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const self = shopPath(locale, { kind: "order", slug: String(orderId) });

  const pay = async (chosen: PaymentProvider) => {
    const result = payKey.settle(
      await run((csrf) =>
        startPayment({ locale, orderId, provider: chosen, idempotencyKey: payKey.key, csrf }),
      ),
    );
    if (result.ok) window.location.assign(result.data.url);
    else if (result.code === "phone_required") setGate(chosen);
  };

  const cancel = async () => {
    const result = cancelKey.settle(
      await run((csrf) => cancelOrder({ locale, orderId, idempotencyKey: cancelKey.key, csrf })),
    );
    setConfirmCancel(false);
    if (result.ok) {
      setNotice(copy.cancelled);
      router.refresh();
    }
  };

  const again = async () => {
    const result = reorderKey.settle(
      await run((csrf) => reorder({ locale, orderId, idempotencyKey: reorderKey.key, csrf })),
    );
    if (result.ok) {
      setCartQuantity(result.data.quantityTotal);
      router.push(shopPath(locale, { kind: "cart" }));
    }
  };

  if (!actions.pay && !actions.cancel && !actions.reorder && !notice) return null;
  const others = providers.filter((value) => value !== provider);
  const message = error && error.code !== "phone_required" ? failureText(error, locale) : "";

  return (
    <div className="flex flex-col gap-3">
      {actions.pay ? (
        <>
          <Button
            size="xl"
            lift
            onClick={() => void pay(provider)}
            disabled={pending}
            aria-busy={pending || undefined}
            className="w-full"
          >
            <Icon name="card" size={20} />
            {copy.payWith(copy.provider[provider])}
          </Button>
          {others.map((value) => (
            <Button
              key={value}
              variant="secondary"
              onClick={() => void pay(value)}
              disabled={pending}
              className="w-full"
            >
              {copy.payWith(copy.provider[value])}
            </Button>
          ))}
        </>
      ) : null}
      {actions.reorder ? (
        <Button
          variant={actions.pay ? "secondary" : "primary"}
          size="lg"
          onClick={() => void again()}
          disabled={pending}
          aria-busy={pending || undefined}
          className="w-full"
        >
          <Icon name="refresh" size={18} />
          {copy.reorder}
        </Button>
      ) : null}
      {actions.cancel ? (
        <Button
          variant="ghost"
          onClick={() => setConfirmCancel(true)}
          disabled={pending}
          className="w-full"
        >
          {copy.cancel}
        </Button>
      ) : null}
      {notice ? <FormNote>{notice}</FormNote> : null}
      {message ? <FormAlert>{message}</FormAlert> : null}
      <AlertDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={copy.cancelTitle}
        description={<p className="m-0 text-body text-ink-muted">{copy.cancelBody}</p>}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="secondary">{copy.cancelKeep}</Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => void cancel()}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {copy.cancelConfirm}
          </Button>
        </div>
      </AlertDialog>
      <PhoneGate
        locale={locale}
        open={gate !== null}
        onOpenChange={(open) => !open && setGate(null)}
        next={self}
        onAttached={() => {
          const chosen = gate ?? provider;
          setGate(null);
          void pay(chosen);
        }}
      />
    </div>
  );
}
