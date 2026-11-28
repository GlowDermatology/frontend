"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { SceneTemplate } from "@/domain/scene";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { sceneTemplatesCopy } from "./copy";

/**
 * A scene template's card in the scene and banner dialogs: a radio (picking it) showing the scene
 * alone (4:5), its name and a line under it, and — beside the radio, not inside it — the pen that
 * opens the editor, pinned to the card's top-right corner.
 */

/** A studio template's swatch: its colours as a gradient (one colour: solid). */
export function swatch(colours: ReadonlyArray<string>): string | undefined {
  if (colours.length === 0) return undefined;
  if (colours.length === 1) return colours[0];
  return `linear-gradient(135deg, ${colours.join(", ")})`;
}

const CARD =
  "flex w-full flex-col items-stretch gap-2 rounded-md border p-2 text-left text-label text-ink transition-colors";
const CHECKED = "border-gold-ink bg-gold-soft ring-1 ring-gold-ink";
const IDLE = "border-line hover:border-gold";

interface TemplateCardProps {
  template: SceneTemplate;
  checked: boolean;
  onSelect: () => void;
  /** The line under the name («Fon rasmini AI chizadi»), if any. */
  lead?: string;
  /** Opens the editor; absent: no pen. */
  onEdit?: () => void;
}

export function TemplateCard({ template, checked, onSelect, lead, onEdit }: TemplateCardProps) {
  const t = useCopy(sceneTemplatesCopy).card;
  return (
    <div className="relative" data-template-card={template.key}>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        data-template={template.key}
        onClick={onSelect}
        className={cn(CARD, checked ? CHECKED : IDLE)}
      >
        <span
          aria-hidden="true"
          className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-sm border border-line bg-surface"
          style={template.previewUrl ? undefined : { background: swatch(template.colours) }}
        >
          {template.previewUrl ? (
            <Image
              src={template.previewUrl}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
              data-template-preview=""
            />
          ) : (
            template.colours.length === 0 && (
              <span className="flex flex-col items-center gap-1 text-caption text-ink-muted">
                <Icon name="image" size={22} className="text-gold-ink" />
                {t.noPicture}
              </span>
            )
          )}
        </span>
        <span className="flex flex-col pr-1">
          <span className="line-clamp-2">{template.name}</span>
          {lead && <span className="text-caption font-normal text-ink-muted">{lead}</span>}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={t.edit(template.name)}
          title={t.edit(template.name)}
          data-template-edit={template.key}
          className="absolute top-3.5 right-3.5 flex size-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm ring-1 ring-line backdrop-blur-sm transition-colors hover:bg-gold-soft hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
        >
          <Icon name="pencil" size={15} />
        </button>
      )}
    </div>
  );
}

/** «Yangi shablon»: a dashed card opening the editor in create mode (not a radio). */
export function NewTemplateCard({
  onClick,
  children,
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  const t = useCopy(sceneTemplatesCopy).card;
  return (
    <button
      type="button"
      onClick={onClick}
      data-template-new=""
      className={cn(CARD, "border-dashed", IDLE)}
    >
      <span
        aria-hidden="true"
        className="flex aspect-[4/5] items-center justify-center rounded-sm border border-dashed border-line bg-surface"
      >
        <Icon name="plus" size={24} className="text-gold-ink" />
      </span>
      <span className="flex flex-col">
        {t.newCard}
        <span className="text-caption font-normal text-ink-muted">{t.newLead}</span>
      </span>
      {children}
    </button>
  );
}
