"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ShopAddress } from "@/domain/shop-account";
import {
  choiceKey,
  sameChoice,
  type DeliveryChoice,
  type ShopDeliveryOption,
} from "@/domain/shop-delivery";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { ordersCopy } from "../copy/orders";
import { formatEtaWindow } from "../orders/delivery-format";
import { optionProblem } from "./delivery-flow";

/**
 * The delivery options of checkout (plan §4): Yandex Standard / Express and
 * BTS, each with the server's fee and ETA window. An unavailable option is a
 * disabled radio with its reason and, where the customer can fix it, the way
 * to: add the map pin (`coordinates_required`), complete the address (BTS
 * region and city) or ask again (`provider_unavailable`).
 */
export function DeliveryOptions({
  locale,
  name,
  options,
  chosen,
  address,
  pending,
  nowMs,
  onChoose,
  onFixAddress,
  onRetry,
}: {
  locale: Locale;
  /** The radio group's name. */
  name: string;
  options: ReadonlyArray<ShopDeliveryOption>;
  chosen: DeliveryChoice | null;
  address: ShopAddress | null;
  pending: boolean;
  /** For "Bugun"/"Ertaga" in the window (the options exist only after the client asked). */
  nowMs: number;
  onChoose: (choice: DeliveryChoice) => void;
  onFixAddress: () => void;
  onRetry: () => void;
}) {
  const copy = ordersCopy[locale];
  const t = copy.delivery;
  return (
    <div className={cn("flex flex-col gap-3", pending && "opacity-80")} aria-busy={pending}>
      {options.map((option) => {
        const key = choiceKey(option);
        const id = `${name}-${key.replace(":", "-")}`;
        const checked = option.available && sameChoice(option, chosen);
        const problem = optionProblem(option, address);
        const etaText = option.available
          ? formatEtaWindow(option.etaFrom, option.etaTo, locale, {
              nowMs,
              today: t.today,
              tomorrow: t.tomorrow,
            })
          : null;
        const price = !option.available
          ? t.unavailable
          : option.fee === 0
            ? t.free
            : option.fee !== null
              ? copy.money(option.fee)
              : "—";
        return (
          <div
            key={key}
            className={cn(
              "flex flex-col gap-3 rounded-md border-[1.5px] p-4 transition-colors duration-150",
              checked
                ? "border-gold-ink bg-gold-soft/60"
                : option.available
                  ? "border-line hover:border-line-strong"
                  : "border-dashed border-line",
            )}
          >
            <label
              className={cn(
                "flex items-start gap-3",
                option.available ? "cursor-pointer" : "cursor-not-allowed",
              )}
            >
              <input
                type="radio"
                name={name}
                value={key}
                checked={checked}
                disabled={!option.available}
                onChange={() => onChoose({ provider: option.provider, method: option.method })}
                aria-describedby={`${id}-detail`}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--gd-gold-ink)] disabled:cursor-not-allowed"
              />
              <Icon
                name={option.provider === "yandex" ? "truck" : "send"}
                size={22}
                className={cn("shrink-0", option.available ? "text-gold-ink" : "text-ink-muted")}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    className={cn("text-label", option.available ? "text-ink" : "text-ink-muted")}
                  >
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      "text-label tabular-nums",
                      option.available ? "text-ink" : "font-normal text-ink-muted",
                    )}
                  >
                    {price}
                  </span>
                </span>
                <span
                  id={`${id}-detail`}
                  className={cn("text-body-sm", checked ? "text-ink" : "text-ink-muted")}
                >
                  {problem ? t.reasons[problem.reason] : etaText ? t.eta(etaText) : null}
                  {option.available && option.scheduled ? (
                    <span className="block text-caption">{t.scheduled}</span>
                  ) : null}
                </span>
              </span>
            </label>
            {problem?.action ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:ml-[62px]"
                onClick={problem.action === "retry" ? onRetry : onFixAddress}
                disabled={problem.action === "retry" && pending}
              >
                <Icon
                  name={
                    problem.action === "pin"
                      ? "map-pin"
                      : problem.action === "edit"
                        ? "pencil"
                        : "refresh"
                  }
                  size={16}
                />
                {problem.action === "pin"
                  ? t.addPin
                  : problem.action === "edit"
                    ? t.editAddress
                    : t.retry}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
