"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { ActionFailure } from "@/data/types";
import type { SpecialistService } from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import type { ContentLanguage } from "@/domain/product";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { newIdempotencyKey, useIdempotencyKey } from "../shared/idempotency";
import type { ServiceActions } from "./card-actions";
import { DeleteDialog } from "./schedule-cards";
import { ServiceDialog } from "./service-dialog";
import { servicesCardCopy } from "./services-copy";

/** A text in the admin language when it has one there (Uzbek is always filled). */
export function serviceText(text: SpecialistService["name"], locale: ContentLanguage): string {
  return text[locale]?.trim() || text.uz;
}

/** The list order: by `position`, then by id (the server's order). */
export function sortServices(services: ReadonlyArray<SpecialistService>): SpecialistService[] {
  return [...services].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
}

/**
 * A refused delete because the service was booked (409 `conflict`, "deactivate instead"): the
 * card offers to deactivate it rather than showing a plain failure.
 */
export function isBookedConflict(failure: Pick<ActionFailure, "code">): boolean {
  return failure.code === "conflict";
}

/**
 * Xizmatlar va narxlar: one specialist's own services (name, category, price, duration) with an
 * active `Switch` per row, created and edited in `ServiceDialog` and deleted after a
 * confirmation. Every write goes through `actions`, so staff (`specialists/{id}/services/…`) and
 * the specialist's own workspace (`specialist/services/…`) share the card. A service that was
 * ever booked cannot be deleted: the 409 becomes a toast offering to deactivate it.
 * `onChange` receives the specialist's list after every write (publish blockers may change).
 */
export function ServicesCard({
  services,
  actions,
  onChange,
}: {
  services: ReadonlyArray<SpecialistService>;
  actions: ServiceActions;
  onChange?: (services: SpecialistService[]) => void;
}) {
  const t = useCopy(servicesCardCopy);
  const m = useCopy(clinicDataCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const toast = useToast();
  const removeKey = useIdempotencyKey();
  const [source, setSource] = useState(services);
  const [rows, setRows] = useState(() => sortServices(services));
  if (services !== source) {
    setSource(services);
    setRows(sortServices(services));
  }
  const [dialog, setDialog] = useState<{ service: SpecialistService | null } | null>(null);
  const [instance, setInstance] = useState(0);
  const [toggling, setToggling] = useState<string | null>(null);
  const [target, setTarget] = useState<SpecialistService | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const replace = (next: SpecialistService[]) => {
    const sorted = sortServices(next);
    setRows(sorted);
    onChange?.(sorted);
  };

  const open = (service: SpecialistService | null) => {
    setInstance((n) => n + 1);
    setDialog({ service });
  };

  const setActive = async (service: SpecialistService, isActive: boolean) => {
    if (toggling) return;
    setToggling(service.id);
    // Setting the same state twice is harmless, so each switch gets its own key (no reuse across
    // services after a failure).
    const key = newIdempotencyKey();
    const result = await runAction((csrf) => actions.setActive(service.id, isActive, key, csrf));
    setToggling(null);
    if (!result.ok) {
      toast({ tone: "danger", title: t.toggleFailed, description: result.error });
      return;
    }
    replace(result.data);
    toast({ tone: "success", title: isActive ? t.activated : t.deactivated });
  };

  const confirmRemove = async () => {
    if (!target || removing) return;
    setRemoving(true);
    setRemoveError(null);
    const result = removeKey.settle(
      await runAction((csrf) => actions.remove(target.id, removeKey.key, csrf)),
    );
    setRemoving(false);
    if (!result.ok && isBookedConflict(result)) {
      // The next delete is a new intent (`settle` renews only after a success).
      removeKey.renew();
      const service = target;
      setTarget(null);
      toast({
        tone: "warning",
        title: t.bookedTitle,
        description: t.bookedText,
        action: service.isActive
          ? { label: t.deactivate, onClick: () => void setActive(service, false) }
          : undefined,
      });
      return;
    }
    if (!result.ok && result.code !== "not_found") {
      setRemoveError(result.error);
      toast({ tone: "danger", title: t.removeFailed, description: result.error });
      return;
    }
    // A service already gone counts as removed; the next delete is a new intent.
    if (!result.ok) removeKey.renew();
    replace(rows.filter((row) => row.id !== target.id));
    setTarget(null);
    toast({ tone: "success", title: t.removed });
  };

  return (
    <Card aria-labelledby="services-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle id="services-title" className="text-heading">
            {t.title}
          </CardTitle>
          <p className="m-0 text-body-sm text-ink-muted">{t.text}</p>
        </div>
        <Button variant="secondary" onClick={() => open(null)}>
          <Icon name="plus" size={18} />
          {t.add}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 rounded-md bg-surface px-3.5 py-3 text-body-sm text-ink-muted">
          {t.empty}
        </p>
      ) : (
        <ul aria-label={t.listLabel} className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((service) => {
            const name = serviceText(service.name, locale);
            const short = serviceText(service.shortName, locale);
            return (
              <li
                key={service.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line p-3"
              >
                <span className="flex min-w-0 flex-1 basis-56 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold break-words text-ink">{name}</span>
                    {!service.isActive && <Badge tone="muted">{t.inactive}</Badge>}
                  </span>
                  <span className="truncate text-[12px] text-ink-muted">
                    {short && short !== name ? `${short} · ` : ""}
                    {m.category[service.category]}
                  </span>
                </span>
                <span className="text-body-sm whitespace-nowrap text-ink tabular-nums">
                  {service.price === 0 ? t.free : fmt.som(service.price)}
                </span>
                <span className="text-body-sm whitespace-nowrap text-ink-muted tabular-nums">
                  {fmt.duration(service.durationMin)}
                </span>
                <span className="flex items-center gap-1">
                  <Switch
                    checked={service.isActive}
                    busy={toggling === service.id}
                    disabledReason={toggling !== null && toggling !== service.id && t.busyReason}
                    onCheckedChange={(checked) => void setActive(service, checked)}
                    aria-label={t.activeSwitch(name)}
                  />
                  <IconButton size="sm" aria-label={t.edit(name)} onClick={() => open(service)}>
                    <Icon name="pencil" size={18} />
                  </IconButton>
                  <IconButton
                    size="sm"
                    aria-label={t.remove(name)}
                    onClick={() => {
                      setRemoveError(null);
                      setTarget(service);
                    }}
                    className="hover:text-danger"
                  >
                    <Icon name="trash" size={18} />
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <ServiceDialog
        key={instance}
        open={dialog !== null}
        service={dialog?.service ?? null}
        actions={actions}
        onOpenChange={(next) => {
          if (!next) setDialog(null);
        }}
        onSaved={(next, created) => {
          replace(next);
          toast({ tone: "success", title: created ? t.created : t.saved });
        }}
      />
      <DeleteDialog
        open={target !== null}
        busy={removing}
        error={removeError}
        title={t.removeTitle}
        body={target ? t.removeBody(serviceText(target.name, locale)) : ""}
        onCancel={() => setTarget(null)}
        onConfirm={() => void confirmRemove()}
      />
    </Card>
  );
}
