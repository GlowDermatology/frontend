"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { acceptTerms } from "@/data/shop/account.actions";
import {
  placeOrder,
  quoteCheckout,
  startPayment,
  type CheckoutSelection,
} from "@/data/shop/commerce.actions";
import type {
  Fulfilment,
  PaymentProvider,
  ShopAddress,
  ShopCart,
  ShopQuote,
  ShopRegion,
} from "@/domain/shop-account";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { AddressDialog } from "../account/address-form";
import { FormAlert } from "../account/controls";
import { PhoneGate } from "../account/phone-gate";
import { useShopSession } from "../account/session-context";
import { failureText, useShopAction } from "../account/use-shop-action";
import { commonCopy } from "../copy/common";
import { ordersCopy } from "../copy/orders";
import { shopHref, shopPath } from "../routing/routes";

/**
 * Checkout (contract §2.6–§2.7): pickup or BTS delivery to a saved address
 * (with "add an address"), Click or Payme, cashback, a note. Every change
 * asks `delivery/calculate/` for the fee, the cashback cap and the total,
 * which is sent unchanged to `orders/checkout/` with one idempotency key per
 * attempt. The refusals the customer can fix are handled in place: the
 * phone gate (409 `phone_required`), new terms (`terms_update_required`),
 * changed prices (`price_changed`) and an earlier unpaid order. A placed
 * order goes straight to payment (`orders/{id}/pay/`) on the provider page.
 */

interface CheckoutViewProps {
  locale: Locale;
  cart: ShopCart;
  addresses: ShopAddress[];
  regions: ShopRegion[];
  fulfilmentMethods: ReadonlyArray<Fulfilment>;
  providers: ReadonlyArray<PaymentProvider>;
  pickupAddress: string;
  termsVersion: string | null;
  termsHref: string;
}

function OptionCard({
  name,
  value,
  checked,
  onChange,
  title,
  hint,
  icon,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] p-4 transition-colors duration-150",
        checked ? "border-gold-ink bg-gold-soft/60" : "border-line hover:border-line-strong",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="size-5 shrink-0 cursor-pointer accent-[var(--gd-gold-ink)]"
      />
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className="text-label text-ink">{title}</span>
        {hint ? (
          <span className={cn("text-body-sm", checked ? "text-ink" : "text-ink-muted")}>
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

const PROVIDER_NAME: Record<PaymentProvider, string> = { click: "Click", payme: "Payme" };

export function CheckoutView({
  locale,
  cart,
  addresses: initialAddresses,
  regions,
  fulfilmentMethods,
  providers,
  pickupAddress,
  termsVersion,
  termsHref,
}: CheckoutViewProps) {
  const copy = ordersCopy[locale];
  const t = copy.checkout;
  const money = copy.money;
  const common = commonCopy[locale];
  const [addresses, setAddresses] = useState(initialAddresses);
  const [fulfilment, setFulfilment] = useState<Fulfilment>(
    fulfilmentMethods.includes("pickup") ? "pickup" : "delivery",
  );
  const [addressId, setAddressId] = useState<number | null>(
    initialAddresses.find((address) => address.isDefault)?.id ?? initialAddresses[0]?.id ?? null,
  );
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] ?? "click");
  const [useCashback, setUseCashback] = useState(false);
  const [note, setNote] = useState("");
  const [rawQuote, setQuote] = useState<ShopQuote | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "placing" | "paying">("idle");
  const [placedOrder, setPlacedOrder] = useState<number | null>(null);
  const quoting = useShopAction(locale);
  const placing = useShopAction(locale);
  const orderKey = useIdempotencyKey();
  const payKey = useIdempotencyKey();
  const { setCartQuantity } = useShopSession();
  const requestId = useRef(0);
  const groupId = useId();

  const selection: CheckoutSelection = {
    fulfilment,
    addressId: fulfilment === "delivery" ? addressId : null,
    cashbackToUse: useCashback ? Math.max(0, cart.cashbackAvailable) : 0,
  };
  const needsAddress = fulfilment === "delivery" && addressId === null;
  const quote = needsAddress ? null : rawQuote;

  const runQuote = quoting.run;
  useEffect(() => {
    if (needsAddress) return;
    const id = ++requestId.current;
    void runQuote((csrf) =>
      quoteCheckout({
        locale,
        selection: {
          fulfilment,
          addressId,
          cashbackToUse: useCashback ? Math.max(0, cart.cashbackAvailable) : 0,
        },
        csrf,
      }),
    ).then((result) => {
      if (id === requestId.current) setQuote(result.ok ? result.data : null);
    });
  }, [locale, fulfilment, addressId, useCashback, cart.cashbackAvailable, needsAddress, runQuote]);

  const pay = async (orderId: number) => {
    setStage("paying");
    const result = payKey.settle(
      await placing.run((csrf) =>
        startPayment({ locale, orderId, provider, idempotencyKey: payKey.key, csrf }),
      ),
    );
    if (result.ok) {
      window.location.assign(result.data.url);
      return;
    }
    if (result.code === "phone_required") {
      setGateOpen(true);
      setStage("idle");
      return;
    }
    // The order exists; its page offers "To‘lash" again.
    window.location.assign(shopHref(locale, { kind: "order", slug: String(orderId) }));
  };

  const place = async () => {
    if (!quote) return;
    if (placedOrder) {
      await pay(placedOrder);
      return;
    }
    setNotice(null);
    setStage("placing");
    const result = orderKey.settle(
      await placing.run((csrf) =>
        placeOrder({
          locale,
          selection: { ...selection, cashbackToUse: quote.cashbackToUse },
          provider,
          expectedTotal: quote.expectedTotal,
          note,
          idempotencyKey: orderKey.key,
          csrf,
        }),
      ),
    );
    if (result.ok) {
      setPlacedOrder(result.data.orderId);
      setCartQuantity(0);
      await pay(result.data.orderId);
      return;
    }
    setStage("idle");
    if (result.code === "phone_required") setGateOpen(true);
    else if (result.code === "terms_update_required") setConsentNeeded(true);
    else if (result.code === "price_changed") {
      setNotice(t.priceChanged);
      requestId.current += 1;
      const id = requestId.current;
      const fresh = await quoting.run((csrf) => quoteCheckout({ locale, selection, csrf }));
      if (id === requestId.current && fresh.ok) setQuote(fresh.data);
    }
  };

  const accept = async () => {
    if (!termsVersion) return;
    const result = await placing.run((csrf) => acceptTerms({ locale, termsVersion, csrf }));
    if (result.ok) {
      setConsentNeeded(false);
      await place();
    }
  };

  const openOrderId =
    placing.error?.code === "open_order_exists" &&
    typeof placing.error.details === "object" &&
    placing.error.details !== null
      ? Number((placing.error.details as { order_id?: unknown }).order_id) || null
      : null;
  const outOfStock = placing.error?.code === "OUT_OF_STOCK";
  const placeError =
    placing.error && !["phone_required", "terms_update_required"].includes(placing.error.code ?? "")
      ? failureText(placing.error, locale)
      : "";
  const quoteError =
    quoting.error && quoting.error.code !== "session_expired"
      ? failureText(quoting.error, locale)
      : "";
  const busy = stage !== "idle" || placing.pending;

  return (
    <div className="grid gap-8 nav:grid-cols-[minmax(0,1fr)_380px] nav:items-start nav:gap-12">
      <div className="flex flex-col gap-8">
        {/* Each radio group sits in its own form (U10): React resolves sibling
            radios by name within the form, so a streamed copy of the markup
            can never be taken for one of them before hydration. */}
        <form
          aria-labelledby="fulfilment-title"
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-4"
        >
          <h2 id="fulfilment-title" className="m-0 font-serif text-[26px] leading-8 font-semibold">
            {t.fulfilmentTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {fulfilmentMethods.includes("pickup") ? (
              <OptionCard
                name={`${groupId}-fulfilment`}
                value="pickup"
                checked={fulfilment === "pickup"}
                onChange={() => setFulfilment("pickup")}
                title={t.pickup}
                hint={t.pickupHint}
                icon={<Icon name="store" size={22} className="text-gold-ink" />}
              />
            ) : null}
            {fulfilmentMethods.includes("delivery") ? (
              <OptionCard
                name={`${groupId}-fulfilment`}
                value="delivery"
                checked={fulfilment === "delivery"}
                onChange={() => setFulfilment("delivery")}
                title={t.delivery}
                hint={t.deliveryHint}
                icon={<Icon name="truck" size={22} className="text-gold-ink" />}
              />
            ) : null}
          </div>
          {fulfilment === "pickup" && pickupAddress ? (
            <p className="m-0 flex items-start gap-2 text-body text-ink-muted">
              <Icon name="map-pin" size={18} className="mt-0.5 shrink-0 text-gold-ink" />
              <span>
                <span className="font-semibold text-ink">{t.pickupAt}: </span>
                {pickupAddress}
              </span>
            </p>
          ) : null}
          {fulfilment === "delivery" ? (
            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="mb-3 text-subheading text-ink">{t.addressTitle}</legend>
              {addresses.length === 0 ? (
                <p className="m-0 text-body text-ink-muted">{t.noAddress}</p>
              ) : null}
              {addresses.map((address) => (
                <OptionCard
                  key={address.id}
                  name={`${groupId}-address`}
                  value={String(address.id)}
                  checked={addressId === address.id}
                  onChange={() => setAddressId(address.id)}
                  title={address.label || address.text}
                  hint={address.label ? address.text : address.comment || undefined}
                />
              ))}
              <Button variant="dashed" onClick={() => setAddressOpen(true)} className="self-start">
                <Icon name="plus" size={18} />
                {t.addAddress}
              </Button>
            </fieldset>
          ) : null}
        </form>

        <form
          aria-labelledby="payment-title"
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-4"
        >
          <h2 id="payment-title" className="m-0 font-serif text-[26px] leading-8 font-semibold">
            {t.paymentTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {providers.map((value) => (
              <OptionCard
                key={value}
                name={`${groupId}-provider`}
                value={value}
                checked={provider === value}
                onChange={() => setProvider(value)}
                title={PROVIDER_NAME[value]}
                icon={<Icon name="card" size={22} className="text-gold-ink" />}
              />
            ))}
          </div>
        </form>

        <section aria-labelledby="cashback-title" className="flex flex-col gap-3">
          <h2 id="cashback-title" className="m-0 font-serif text-[26px] leading-8 font-semibold">
            {t.cashbackTitle}
          </h2>
          {cart.cashbackAvailable > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-4">
              <div className="flex flex-col">
                <span className="text-label">{t.cashbackUse}</span>
                <span className="text-body-sm text-ink-muted">
                  {t.cashbackMax(money(quote?.cashbackMax ?? cart.cashbackMaxPickup))}
                </span>
              </div>
              <Switch
                id="use-cashback"
                aria-label={t.cashbackUse}
                checked={useCashback}
                onCheckedChange={setUseCashback}
              />
            </div>
          ) : (
            <p className="m-0 text-body text-ink-muted">{t.cashbackNone}</p>
          )}
        </section>

        <Field label={t.noteLabel}>
          {(control) => (
            <TextArea
              {...control}
              rows={2}
              maxLength={300}
              placeholder={t.notePlaceholder}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
      </div>

      <aside
        aria-labelledby="checkout-summary"
        className="flex flex-col gap-5 rounded-lg border border-line bg-surface-raised p-6 nav:sticky nav:top-6"
      >
        <h2 id="checkout-summary" className="m-0 font-serif text-[26px] leading-8 font-semibold">
          {t.summaryTitle}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-body-sm">
          {cart.lines.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ink-muted">
                {line.quantity} × {line.name}
              </span>
              <span className="shrink-0 tabular-nums">{money(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl
          aria-live="polite"
          className="m-0 flex flex-col gap-3 border-t border-line pt-4 text-body"
        >
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{t.subtotal}</dt>
            <dd className="m-0 tabular-nums">
              {money(quote?.itemsSubtotal ?? cart.itemsSubtotal)}
            </dd>
          </div>
          {/* Pickup has no delivery line (U17). */}
          {fulfilment === "delivery" ? (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{t.deliveryFee}</dt>
              <dd className="m-0 tabular-nums">
                {quote ? (quote.deliveryFee > 0 ? money(quote.deliveryFee) : t.free) : "—"}
              </dd>
            </div>
          ) : null}
          {quote && quote.cashbackToUse > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{t.cashback}</dt>
              <dd className="m-0 text-ink tabular-nums">−{money(quote.cashbackToUse)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-4">
            <dt className="text-subheading">{t.total}</dt>
            <dd className="m-0 text-price-lg tabular-nums">
              {quote ? money(quote.expectedTotal) : quoting.pending ? t.calculating : "—"}
            </dd>
          </div>
        </dl>
        {notice ? <FormAlert>{notice}</FormAlert> : null}
        {quoteError ? <FormAlert>{quoteError}</FormAlert> : null}
        {placeError && !notice ? <FormAlert>{placeError}</FormAlert> : null}
        {openOrderId ? (
          <Link
            href={shopPath(locale, { kind: "order", slug: String(openOrderId) })}
            className={buttonStyles({ variant: "secondary" })}
          >
            {t.openOrder}
          </Link>
        ) : null}
        {outOfStock ? (
          <Link
            href={shopPath(locale, { kind: "cart" })}
            className={buttonStyles({ variant: "secondary" })}
          >
            {t.backToCart}
          </Link>
        ) : null}
        {consentNeeded ? (
          <div role="alert" className="flex flex-col gap-3 rounded-md bg-gold-soft p-4">
            <p className="m-0 text-label">{common.consent.title}</p>
            <p className="m-0 text-body-sm text-ink">{common.consent.body}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={termsHref}
                target="_blank"
                rel="noopener"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                {common.consent.read}
              </a>
              <Button
                size="sm"
                onClick={() => void accept()}
                disabled={busy}
                aria-busy={busy || undefined}
              >
                {common.consent.accept}
              </Button>
            </div>
          </div>
        ) : null}
        <Button
          size="xl"
          lift
          onClick={() => void place()}
          disabled={busy || !quote || needsAddress || quoting.pending}
          aria-busy={busy || undefined}
          className="w-full"
        >
          {stage === "placing" ? t.placing : stage === "paying" ? t.redirecting : t.placeOrder}
        </Button>
        <Link
          href={shopPath(locale, { kind: "cart" })}
          className="text-center text-label text-ink underline decoration-gold underline-offset-4"
        >
          {t.backToCart}
        </Link>
      </aside>

      {addressOpen ? (
        <AddressDialog
          locale={locale}
          open={addressOpen}
          onOpenChange={setAddressOpen}
          regions={regions}
          address={null}
          onSaved={(address) => {
            setAddresses((current) => [
              ...current.map((item) => (address.isDefault ? { ...item, isDefault: false } : item)),
              address,
            ]);
            setAddressId(address.id);
          }}
        />
      ) : null}
      <PhoneGate
        locale={locale}
        open={gateOpen}
        onOpenChange={setGateOpen}
        next={shopPath(locale, { kind: "checkout" })}
        onAttached={() => void place()}
      />
    </div>
  );
}
