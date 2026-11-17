"use client";

import { DropdownMenu } from "radix-ui";

import { cn } from "@/lib/cn";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme/theme-cookie";
import { setThemeChoice, useThemeChoice } from "@/lib/theme/theme-store";

import { Icon, type IconName } from "./icon";
import { usePortalContainer } from "./layer";
import { MenuRadioGroup, MenuRadioItem, menuContentClass } from "./menu";
import { SegmentedControl } from "./segmented-control";

/**
 * The colour theme controls: «Mavzu» light / dark / like the device. Both read and save the
 * browser's choice (`useThemeChoice` / `setThemeChoice`, cookie `gd_theme`), which applies at once.
 * Texts come in as `labels` (`themeCopy[locale]` from `components/brand/copy.ts`).
 */

export interface ThemeLabels {
  /** The control's name, e.g. «Mavzu». */
  label: string;
  light: string;
  dark: string;
  system: string;
}

export const THEME_ICONS: Readonly<Record<ThemeChoice, IconName>> = {
  light: "sun",
  dark: "moon",
  system: "monitor",
};

interface ThemeSegmentsProps {
  labels: ThemeLabels;
  /**
   * `menu` (default): a row inside a `DropdownMenu.Content` — the name, then three icon radio
   * items (`menuitemradio`, named by their label); choosing one keeps the menu open.
   * `standalone`: a `SegmentedControl` (native radios) for a page or a drawer foot.
   */
  variant?: "menu" | "standalone";
  /** Standalone only: show the labels beside the icons (default) or the icons alone. */
  showText?: boolean;
  className?: string;
}

/** The inline three-way theme switch (sun · moon · monitor). */
export function ThemeSegments({
  labels,
  variant = "menu",
  showText = true,
  className,
}: ThemeSegmentsProps) {
  const choice = useThemeChoice();

  if (variant === "standalone") {
    return (
      <SegmentedControl<ThemeChoice>
        label={labels.label}
        value={choice}
        onChange={setThemeChoice}
        size="sm"
        className={className}
        options={THEME_CHOICES.map((value) => ({
          value,
          label: (
            <>
              <Icon name={THEME_ICONS[value]} size={16} />
              {showText ? labels[value] : <span className="sr-only">{labels[value]}</span>}
            </>
          ),
        }))}
      />
    );
  }

  return (
    <div
      data-theme-segments=""
      className={cn("flex min-h-10 items-center gap-3 py-1 pr-1 pl-3", className)}
    >
      <span aria-hidden="true" className="min-w-0 flex-1 truncate text-label text-ink">
        {labels.label}
      </span>
      <DropdownMenu.RadioGroup
        aria-label={labels.label}
        value={choice}
        onValueChange={(next) => setThemeChoice(next as ThemeChoice)}
        className="flex shrink-0 gap-0.5 rounded-md bg-gold-soft p-0.5"
      >
        {THEME_CHOICES.map((value) => (
          <DropdownMenu.RadioItem
            key={value}
            value={value}
            aria-label={labels[value]}
            title={labels[value]}
            /* The theme applies at once: the menu stays open to compare. */
            onSelect={(event) => event.preventDefault()}
            className="flex size-8 cursor-pointer items-center justify-center rounded-[9px] text-ink-muted outline-none select-none data-[highlighted]:text-ink data-[highlighted]:outline-2 data-[highlighted]:outline-offset-[-2px] data-[highlighted]:outline-gold-ink data-[state=checked]:bg-surface-raised data-[state=checked]:text-ink data-[state=checked]:shadow-sm"
          >
            <Icon name={THEME_ICONS[value]} size={18} />
          </DropdownMenu.RadioItem>
        ))}
      </DropdownMenu.RadioGroup>
    </div>
  );
}

interface ThemeMenuProps {
  labels: ThemeLabels;
  align?: "start" | "end";
  /** Replaces the default round 40px icon trigger's classes. */
  triggerClassName?: string;
}

/**
 * A compact theme menu for headers and brand rows (no profile menu there): an icon button showing
 * the current choice, opening the three choices as radio rows; choosing one closes the menu.
 */
export function ThemeMenu({ labels, align = "end", triggerClassName }: ThemeMenuProps) {
  const choice = useThemeChoice();
  const container = usePortalContainer();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={labels.label}
        title={labels.label}
        data-theme-menu=""
        className={
          triggerClassName ??
          "flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors duration-150 hover:bg-gold-soft data-[state=open]:bg-gold-soft"
        }
      >
        <Icon name={THEME_ICONS[choice]} size={18} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          aria-label={labels.label}
          className={cn(menuContentClass, "min-w-[200px]")}
        >
          <MenuRadioGroup<ThemeChoice>
            label={labels.label}
            value={choice}
            onValueChange={setThemeChoice}
          >
            {THEME_CHOICES.map((value) => (
              <MenuRadioItem
                key={value}
                value={value}
                icon={<Icon name={THEME_ICONS[value]} size={18} />}
              >
                {labels[value]}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
