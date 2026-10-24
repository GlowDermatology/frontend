"use client";

import { useId, useState, type ReactNode } from "react";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";

const TIMES = ["09:30", "10:30", "11:00", "14:00", "15:30", "17:00"] as const;
const BOOKED = new Set<string>(["14:00"]);

type BookingDict = LandingDictionary["specialists"]["booking"];

/**
 * Interactive preview of the app's booking step. Selections stay local; the
 * real booking happens in the mobile app, so the button leads to the download
 * section rather than pretending to book.
 */
export function BookingPreview({ dict }: { dict: BookingDict }) {
  const [service, setService] = useState(0);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState<string>("10:30");
  const name = useId();

  return (
    <div
      role="group"
      aria-label={dict.label}
      className="flex w-full max-w-[520px] flex-col gap-[22px] justify-self-center rounded-lg border border-line bg-surface p-[clamp(20px,3vw,32px)] shadow-lg"
    >
      <div className="flex items-center gap-3.5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
          <Icon name="user" size={26} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-price text-ink">{dict.specialistName}</span>
          <span className="text-body-sm text-ink-muted">{dict.specialistRole}</span>
        </span>
      </div>
      <div className="h-px bg-line" />

      <Group legend={dict.serviceLabel}>
        <div className="flex flex-col gap-2.5">
          {dict.services.map((item, index) => (
            <Choice
              key={item.name}
              name={`${name}-service`}
              checked={service === index}
              onSelect={() => setService(index)}
              className="min-h-[60px] justify-between gap-3 px-4 py-2.5 text-left"
              selectedClassName="border-2 border-gold bg-gold-soft"
              idleClassName="border border-line-strong"
            >
              <span className="flex flex-col">
                <span className="text-[15px] leading-5 font-semibold">{item.name}</span>
                <span className="text-body-sm text-ink-muted">{item.duration}</span>
              </span>
              <span className="text-[15px] font-bold">{item.price}</span>
            </Choice>
          ))}
        </div>
      </Group>

      <Group legend={dict.dateLabel}>
        <div className="grid grid-cols-6 gap-2">
          {dict.days.map((item, index) => {
            const selected = day === index;
            return (
              <Choice
                key={item.day}
                name={`${name}-day`}
                checked={selected}
                onSelect={() => setDay(index)}
                className="h-16 flex-col justify-center gap-0.5"
                selectedClassName="bg-gold text-on-gold"
                idleClassName="border border-line-strong"
              >
                <span className={cn("text-[12px]", !selected && "text-ink-muted")}>
                  {item.weekday}
                </span>
                <span className="text-[18px] font-bold tabular-nums">{item.day}</span>
              </Choice>
            );
          })}
        </div>
      </Group>

      <Group legend={dict.timeLabel}>
        <div className="grid grid-cols-3 gap-2">
          {TIMES.map((slot) => {
            const booked = BOOKED.has(slot);
            const selected = time === slot;
            return (
              <Choice
                key={slot}
                name={`${name}-time`}
                checked={selected}
                disabled={booked}
                onSelect={() => setTime(slot)}
                className={cn(
                  "h-11 justify-center text-[14px] leading-none",
                  selected ? "font-bold" : "font-semibold",
                )}
                selectedClassName="bg-gold text-on-gold"
                idleClassName={
                  booked
                    ? "border border-dashed border-line text-ink-muted line-through"
                    : "border border-line-strong"
                }
              >
                {slot}
                {booked && <span className="sr-only">, {dict.unavailable}</span>}
              </Choice>
            );
          })}
        </div>
      </Group>

      <a
        href={`#${SECTION_IDS.download}`}
        className={buttonStyles({ size: "lg", lift: true, className: "w-full" })}
      >
        {dict.submit}
      </a>
    </div>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
      <legend className="mb-2.5 p-0 text-label text-ink">{legend}</legend>
      {children}
    </fieldset>
  );
}

interface ChoiceProps {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  className: string;
  selectedClassName: string;
  idleClassName: string;
  children: ReactNode;
}

/** A native radio rendered as a selectable tile (arrow keys move the choice). */
function Choice({
  name,
  checked,
  disabled,
  onSelect,
  className,
  selectedClassName,
  idleClassName,
  children,
}: ChoiceProps) {
  return (
    <label
      className={cn(
        "relative flex items-center rounded-md text-ink transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-ink",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        checked ? selectedClassName : cn(idleClassName, !disabled && "hover:bg-gold-soft/60"),
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="absolute inset-0 m-0 cursor-[inherit] appearance-none rounded-md focus-visible:outline-none"
      />
      {children}
    </label>
  );
}
