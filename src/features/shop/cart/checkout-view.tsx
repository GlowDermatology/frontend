"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

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
import {
  findOption,
  isDeliveryConflict,
  quoteExpiredAt,
  requoteAt,
  sameChoice,
  type DeliveryChoice,
  type ShopDeliveryOption,
} from "@/domain/shop-delivery";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { AddressDialog } from "../account/address-form";
import { AddressPinNote } from "../account/address-pin-note";
import { FormAlert } from "../account/controls";
import { PhoneGate } from "../account/phone-gate";
import { useShopSession } from "../account/session-context";
import { failureText, useShopAction } from "../account/use-shop-action";
import { commonCopy } from "../copy/common";
import { ordersCopy } from "../copy/orders";
import { shopHref, shopPath } from "../routing/routes";
import {
  checkoutTerms,
  compareQuotes,
  conflictOptions,
  displayedChoice,
  outcomeNotice,
  placeable,
  readConflict,
  seenTerms,
  selectedChoice,
} from "./delivery-flow";
import { DeliveryOptions } from "./delivery-options";

/**
 * Checkout (contract §2.6–§2.7, Yandex Delivery plan §4): pickup or delivery
 * to a saved address (with "add an address"), Click, Payme or Uzum, cashback, a
 * note. Every change asks `delivery/calculate/` (`with_options`) for every
 * delivery option — Yandex Standard / Express and BTS with the server's fee
 * and ETA window, the unavailable ones with their reason — and for the fee,
 * cashback cap and total of the selected one (the server's default until
 * the customer picks another). That total is sent unchanged to
 * `orders/checkout/`, with the option's `delivery_quote_id` for Yandex (BTS
 * keeps the released request), one idempotency key per attempt.
 *
 * The quote is asked again when the address, the cart or the choice
 * changes and shortly before its `quote_expires_at`. The refusals the
 * customer can fix are handled in place: the phone gate (409
 * `phone_required`), new terms (`terms_update_required`), changed prices
 * (`price_changed`: the items, or a Yandex fee — the new price and options
 * are shown and the order waits for a confirmation), an expired quote
 * (`quote_expired`: asked again silently once, then the customer
 * confirms), no delivery to the address (`delivery_unavailable`), a missing
 * map pin (`coordinates_required`: the address dialog opens on the map) and
 * an earlier unpaid order. A placed order goes straight to payment
 * (`orders/{id}/pay/`) on the provider page.
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
  meta,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  /** A line under the hint (the address's map-pin note). */
  meta?: React.ReactNode;
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
        {meta}
      </span>
    </label>
  );
}

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
  /** The customer's pick (`null` = the server's default). */
  const [preferred, setPreferred] = useState<DeliveryChoice | null>(null);
  /** The options a `delivery_unavailable` answer listed (every one refused). */
  const [refusedOptions, setRefusedOptions] = useState<ShopDeliveryOption[] | null>(null);
  /** Bumped to ask for the quote again with unchanged inputs (address edited, retry, expiry). */
  const [revision, setRevision] = useState(0);
  /** The clock the ETA labels ("Bugun") are read against: the moment the quote arrived. */
  const [quotedAtMs, setQuotedAtMs] = useState(0);
  const [editing, setEditing] = useState<ShopAddress | "new" | null>(null);
  const [confirmPrice, setConfirmPrice] = useState(false);
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
  const router = useRouter();
  const requestId = useRef(0);
  const lastQuote = useRef<{ quote: ShopQuote; inputs: string } | null>(null);
  const silentNext = useRef(false);
  const groupId = useId();

  const cashbackToUse = useCashback ? Math.max(0, cart.cashbackAvailable) : 0;
  const selection: CheckoutSelection = {
    fulfilment,
    addressId: fulfilment === "delivery" ? addressId : null,
    cashbackToUse,
  };
  const needsAddress = fulfilment === "delivery" && addressId === null;
  const quote = needsAddress ? null : rawQuote;
  const address = addresses.find((item) => item.id === addressId) ?? null;
  const cartSignature = `${cart.quantityTotal}:${cart.itemsSubtotal}:${cart.lines
    .map((line) => `${line.productId}x${line.quantity}`)
    .join(",")}`;

  const runQuote = quoting.run;
  /**
   * Asks `delivery/calculate/`; only the newest request lands. A silent
   * re-quote (the quote ran out with nothing else changed) says so when the
   * selected option's fee moved or the option went away.
   */
  const requestQuote = useCallback(
    (input: {
      selection: CheckoutSelection;
      delivery: DeliveryChoice | null;
    }): Promise<ShopQuote | null> => {
      const id = ++requestId.current;
      const silent = silentNext.current;
      silentNext.current = false;
      const inputs = JSON.stringify(input);
      return runQuote((csrf) =>
        quoteCheckout({ locale, selection: input.selection, delivery: input.delivery, csrf }),
      ).then((result) => {
        if (id !== requestId.current) return null;
        if (!result.ok) {
          setQuote(null);
          lastQuote.current = null;
          setRefusedOptions(
            isDeliveryConflict(result.details) ? (result.details.options ?? []) : null,
          );
          return null;
        }
        const previous = lastQuote.current;
        lastQuote.current = { quote: result.data, inputs };
        setQuote(result.data);
        setRefusedOptions(null);
        setQuotedAtMs(Date.now());
        // Only a re-quote of unchanged inputs is compared: other changes show their own numbers.
        if (silent && previous?.inputs === inputs) {
          const outcome = compareQuotes(seenTerms(previous.quote), result.data);
          const copy = ordersCopy[locale];
          const text = outcomeNotice(
            outcome,
            { ...copy.checkout, none: copy.delivery.none },
            copy.money,
          );
          if (text) {
            setNotice(text);
            setConfirmPrice(outcome.kind !== "none");
          }
        }
        return result.data;
      });
    },
    [locale, runQuote],
  );

  useEffect(() => {
    const restorePage = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restorePage);
    return () => window.removeEventListener("pageshow", restorePage);
  }, []);
  useEffect(() => {
    if (needsAddress) return;
    void requestQuote({
      selection: { fulfilment, addressId, cashbackToUse },
      delivery: fulfilment === "delivery" ? preferred : null,
    });
  }, [
    requestQuote,
    fulfilment,
    addressId,
    cashbackToUse,
    preferred,
    needsAddress,
    revision,
    cartSignature,
  ]);

  // A Yandex quote lives 15 minutes: ask again as soon as it runs out, and
  // at once when the tab comes back after it did.
  const quoteDeadline = quote ? requoteAt(quote, quotedAtMs) : null;
  useEffect(() => {
    if (quoteDeadline === null) return;
    const requote = () => {
      silentNext.current = true;
      setRevision((value) => value + 1);
    };
    const timer = window.setTimeout(requote, Math.max(0, quoteDeadline - Date.now()));
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() >= quoteDeadline) requote();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [quoteDeadline]);

  /** The inputs of a re-quote for the option `current` was placed with. */
  const requoteFor = (current: ShopQuote | null) => ({
    selection,
    delivery: fulfilment === "delivery" ? (selectedChoice(current) ?? preferred) : null,
  });

  const resetPrompt = () => {
    setNotice(null);
    setConfirmPrice(false);
  };
  const outcomeTexts = { ...t, none: copy.delivery.none };

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

  /**
   * Places the order with `current` (the quote the customer sees). On a
   * delivery refusal the options are asked for again: an expired quote is
   * re-quoted silently once and, when nothing changed, placed again at once;
   * anything else waits for the customer to confirm the new terms.
   */
  const submit = async (current: ShopQuote, retried: boolean): Promise<void> => {
    setNotice(null);
    setStage("placing");
    const terms = checkoutTerms(current);
    const result = orderKey.settle(
      await placing.run((csrf) =>
        placeOrder({
          locale,
          selection: { ...selection, cashbackToUse: current.cashbackToUse },
          provider,
          expectedTotal: terms.expectedTotal,
          deliveryQuoteId: terms.deliveryQuoteId,
          note,
          idempotencyKey: orderKey.key,
          csrf,
        }),
      ),
    );
    if (result.ok) {
      setConfirmPrice(false);
      setPlacedOrder(result.data.orderId);
      setCartQuantity(cart.quantityTotal);
      await pay(result.data.orderId);
      return;
    }
    setStage("idle");
    if (result.code === "open_order_exists") {
      window.location.assign(shopHref(locale, { kind: "cart" }));
      return;
    }
    if (result.code === "phone_required") {
      setGateOpen(true);
      return;
    }
    if (result.code === "terms_update_required") {
      setConsentNeeded(true);
      return;
    }
    const conflict = readConflict(result);
    if (!conflict) return;
    switch (conflict.kind) {
      case "price_changed": {
        // The items or the cashback moved: fresh cart lines and a fresh quote.
        setNotice(t.priceChanged);
        setConfirmPrice(true);
        router.refresh();
        await requestQuote(requoteFor(current));
        return;
      }
      case "delivery_price_changed": {
        // A Yandex re-quote gave another fee: show it and the fresh options, then ask.
        setNotice(
          conflict.fee !== null
            ? t.deliveryPriceChanged(money(current.deliveryFee), money(conflict.fee))
            : t.quoteExpired,
        );
        setConfirmPrice(true);
        setQuote({ ...current, options: conflictOptions(conflict, current.options) });
        await requestQuote(requoteFor(current));
        return;
      }
      case "quote_expired": {
        const fresh = await requestQuote(requoteFor(current));
        if (!fresh) {
          // The re-quote was refused (its message and the options say why) or superseded.
          placing.setError(null);
          return;
        }
        const outcome = compareQuotes(seenTerms(current), fresh);
        if (outcome.kind === "same" && !retried) {
          await submit(fresh, true);
          return;
        }
        setNotice(outcomeNotice(outcome, outcomeTexts, money) ?? t.quoteExpired);
        setConfirmPrice(outcome.kind !== "none");
        return;
      }
      case "delivery_unavailable": {
        setNotice(failureText(result, locale) || copy.delivery.none);
        await requestQuote(requoteFor(current));
        return;
      }
    }
  };

  const place = async () => {
    if (!quote || !placeable(quote)) return;
    if (placedOrder) {
      await pay(placedOrder);
      return;
    }
    let current = quote;
    if (quote.fulfilment === "delivery" && quoteExpiredAt(quoteDeadline, Date.now())) {
      // The quote ran out while the page sat open: ask again before placing.
      const fresh = await requestQuote(requoteFor(quote));
      if (!fresh) return;
      const outcome = compareQuotes(seenTerms(quote), fresh);
      if (outcome.kind !== "same") {
        setNotice(outcomeNotice(outcome, outcomeTexts, money));
        setConfirmPrice(outcome.kind !== "none");
        return;
      }
      current = fresh;
    }
    await submit(current, false);
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

  const options = fulfilment === "delivery" ? (quote?.options ?? refusedOptions ?? []) : [];
  const chosen = displayedChoice(quote, preferred, quoting.pending);
  const selected = selectedChoice(quote);
  // While a newly picked option is being quoted, its totals are not known yet.
  const switching = quoting.pending && !sameChoice(chosen, selected);
  const selectedLabel = findOption(quote?.options ?? [], selected)?.label ?? null;
  const choose = (choice: DeliveryChoice) => {
    if (sameChoice(choice, chosen)) return;
    resetPrompt();
    setPreferred(choice);
  };
  const saved = (next: ShopAddress) => {
    setAddresses((current) => {
      const updated = current.map((item) =>
        item.id === next.id ? next : next.isDefault ? { ...item, isDefault: false } : item,
      );
      return current.some((item) => item.id === next.id) ? updated : [...updated, next];
    });
    setAddressId(next.id);
    resetPrompt();
    setRevision((value) => value + 1);
  };

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
                onChange={() => {
                  resetPrompt();
                  setFulfilment("pickup");
                }}
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
                onChange={() => {
                  resetPrompt();
                  setFulfilment("delivery");
                }}
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
                  onChange={() => {
                    resetPrompt();
                    setAddressId(address.id);
                  }}
                  title={address.label || address.text}
                  hint={address.label ? address.text : address.comment || undefined}
                  meta={<AddressPinNote locale={locale} address={address} className="mt-1" />}
                />
              ))}
              <Button variant="dashed" onClick={() => setEditing("new")} className="self-start">
                <Icon name="plus" size={18} />
                {t.addAddress}
              </Button>
            </fieldset>
          ) : null}
        </form>

        {fulfilment === "delivery" && !needsAddress && (options.length > 0 || quoting.pending) ? (
          <form
            aria-labelledby="delivery-option-title"
            aria-busy={quoting.pending || undefined}
            onSubmit={(event) => event.preventDefault()}
            className="flex flex-col gap-4"
          >
            <h2
              id="delivery-option-title"
              className="m-0 font-serif text-[26px] leading-8 font-semibold"
            >
              {copy.delivery.title}
            </h2>
            {options.length > 0 ? (
              <DeliveryOptions
                locale={locale}
                name={`${groupId}-delivery`}
                options={options}
                chosen={chosen}
                address={address}
                pending={quoting.pending}
                nowMs={quotedAtMs}
                onChoose={choose}
                onFixAddress={() => setEditing(address)}
                onRetry={() => {
                  resetPrompt();
                  setRevision((value) => value + 1);
                }}
              />
            ) : (
              <p role="status" className="m-0 text-body text-ink-muted">
                {copy.delivery.loading}
              </p>
            )}
          </form>
        ) : null}

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
                title={copy.order.provider[value]}
                hint={value === "uzum" ? t.uzumHint : undefined}
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
                onCheckedChange={(value) => {
                  resetPrompt();
                  setUseCashback(value);
                }}
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
              <dt className="text-ink-muted">
                {t.deliveryFee}
                {selectedLabel && !switching ? (
                  <span className="block text-caption">{selectedLabel}</span>
                ) : null}
              </dt>
              <dd className="m-0 tabular-nums">
                {switching
                  ? t.calculating
                  : quote
                    ? quote.deliveryFee > 0
                      ? money(quote.deliveryFee)
                      : t.free
                    : "—"}
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
              {switching
                ? t.calculating
                : quote
                  ? money(checkoutTerms(quote).expectedTotal)
                  : quoting.pending
                    ? t.calculating
                    : "—"}
            </dd>
          </div>
        </dl>
        {notice ? <FormAlert>{notice}</FormAlert> : null}
        {quoteError && !notice ? <FormAlert>{quoteError}</FormAlert> : null}
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
          disabled={busy || !placeable(quote) || needsAddress || quoting.pending}
          aria-busy={busy || undefined}
          className="w-full"
        >
          {stage === "placing"
            ? t.placing
            : stage === "paying"
              ? t.redirecting
              : confirmPrice
                ? t.confirmNewPrice
                : t.placeOrder}
        </Button>
        <Link
          href={shopPath(locale, { kind: "cart" })}
          className="text-center text-label text-ink underline decoration-gold underline-offset-4"
        >
          {t.backToCart}
        </Link>
      </aside>

      {editing ? (
        <AddressDialog
          key={editing === "new" ? "new" : editing.id}
          locale={locale}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          regions={regions}
          address={editing === "new" ? null : editing}
          onSaved={saved}
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
