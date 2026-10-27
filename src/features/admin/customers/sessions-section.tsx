"use client";

import { useRef, useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { loadCustomerSessions, revokeCustomerSession } from "@/data/customers.actions";
import type { Page } from "@/data/types";
import { DEVICE_PLATFORM_LABEL, type CustomerSession } from "@/domain/customer";
import { formatDateTimeShort, formatNumber } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { rangeLabel } from "../shared/pagination";
import { sessionLabel } from "./labels";

interface SessionsSectionProps {
  customerId: string;
  /** The first page, read with the card (`null`: the list could not be read). */
  initial: Page<CustomerSession> | null;
  /** A deleted customer has no sessions: the section explains why. */
  deleted: boolean;
}

const arrowClass =
  "flex size-9 items-center justify-center rounded-md border border-line-strong text-ink hover:bg-gold-soft disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted disabled:hover:bg-transparent";

/**
 * «Faol seanslar» (contract §2.6, B-W1): every phone and browser the
 * customer is signed in on, most recently active first, 20 per page. Staff
 * can sign one out («Seansni tugatish», behind a confirmation); the server
 * records it in the audit log (`customer.session_revoked`, actor = the
 * staff member) and the customer's client is signed out on its next request.
 */
export function SessionsSection({ customerId, initial, deleted }: SessionsSectionProps) {
  const toast = useToast();
  const [source, setSource] = useState(initial);
  const [page, setPage] = useState(initial);
  // A refreshed card (api mode re-renders the route after a sign-out) brings
  // a new first page; adopt it only while the first page is shown.
  if (initial !== source) {
    setSource(initial);
    if (!page || page.page === 1) setPage(initial);
  }
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<CustomerSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const idempotency = useIdempotencyKey();
  const inFlight = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const goTo = async (target: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setLoadError(null);
    const result = await runAction((csrf) => loadCustomerSessions(customerId, target, csrf));
    inFlight.current = false;
    setLoading(false);
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    setPage(result.data);
  };

  const confirmRevoke = async () => {
    if (!revoking || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setRevokeError(null);
    const target = revoking;
    const result = idempotency.settle(
      await runAction((csrf) =>
        revokeCustomerSession(customerId, target.id, page?.page ?? 1, idempotency.key, csrf),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      setRevokeError(result.error);
      return;
    }
    setPage(result.data.sessions);
    setRevoking(null);
    if (result.data.revoked) {
      toast({
        title: "Seans tugatildi",
        description: `${sessionLabel(target)} hisobdan chiqarildi. Amal jurnalga yozildi.`,
      });
    } else {
      toast({
        tone: "info",
        title: "Seans allaqachon tugagan",
        description: `${sessionLabel(target)}: mijoz bu qurilmadan chiqqan. Ro‘yxat yangilandi.`,
      });
    }
  };

  const rows = page?.items ?? [];
  const total = page?.total ?? 0;

  return (
    <Card aria-labelledby="customer-sessions-title" className="flex flex-col gap-3.5 p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
        <CardTitle id="customer-sessions-title">
          <span ref={titleRef} tabIndex={-1} className="focus-visible:outline-none">
            Faol seanslar
          </span>
        </CardTitle>
        {page && total > 0 && (
          <span className="text-caption font-normal text-ink-muted tabular-nums">
            {formatNumber(total)} ta qurilma va brauzer
          </span>
        )}
      </div>

      {!page ? (
        <p role="alert" className="m-0 px-5 pb-5 text-body-sm text-ink-muted">
          Seanslarni o‘qib bo‘lmadi. Sahifani yangilang.
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-8 text-center">
          <Icon name="monitor" size={28} className="text-ink-muted" />
          <p className="m-0 text-body-sm font-semibold text-ink">Faol seans yo‘q</p>
          <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
            {deleted
              ? "Hisob o‘chirilgan: barcha seanslar tugatilgan."
              : "Mijoz hozir hech qaysi telefon yoki brauzerda hisobiga kirmagan."}
          </p>
        </div>
      ) : (
        <ScrollRegion label="Faol seanslar">
          <table className="data-table min-w-[760px]" aria-busy={loading}>
            <caption className="sr-only">
              Faol seanslar, oxirgi faollik bo‘yicha (eng yangisi birinchi)
            </caption>
            <thead>
              <tr>
                <th scope="col">QURILMA</th>
                <th scope="col">PLATFORMA</th>
                <th scope="col">JOYLASHUV</th>
                <th scope="col">YARATILGAN</th>
                <th scope="col">YANGILANGAN</th>
                <th scope="col">
                  <span className="sr-only">Amal</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-session-id={row.id}>
                  <td className="font-semibold">
                    <span className="flex items-center gap-2">
                      <Icon
                        name={row.platform === "web" ? "monitor" : "smartphone"}
                        size={18}
                        className="shrink-0 text-gold-ink"
                      />
                      {row.device}
                    </span>
                  </td>
                  <td>{row.platform ? DEVICE_PLATFORM_LABEL[row.platform] : "—"}</td>
                  <td className="text-ink-muted!">{row.location}</td>
                  <td className="text-ink-muted! tabular-nums">
                    <time dateTime={row.createdAt}>{formatDateTimeShort(row.createdAt)}</time>
                  </td>
                  <td className="tabular-nums">
                    <time dateTime={row.updatedAt}>{formatDateTimeShort(row.updatedAt)}</time>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setRevokeError(null);
                        setRevoking(row);
                      }}
                      aria-label={`Seansni tugatish: ${sessionLabel(row)}`}
                      className={buttonStyles({ variant: "ghost", size: "sm" })}
                    >
                      <Icon name="logout" size={16} />
                      Seansni tugatish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {page && (page.pageCount > 1 || loadError) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="text-body-sm text-ink-muted tabular-nums">
            {rangeLabel(page.page, page.pageSize, total)}
          </span>
          {loadError && (
            <span role="alert" className="text-body-sm font-semibold text-ink">
              {loadError}
            </span>
          )}
          <nav aria-label="Seanslar sahifalari" className="flex items-center gap-1">
            <button
              type="button"
              className={arrowClass}
              aria-label="Oldingi sahifa"
              disabled={page.page <= 1 || loading}
              onClick={() => goTo(page.page - 1)}
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <span className="px-2 text-body-sm font-semibold text-ink tabular-nums">
              {page.page} / {page.pageCount}
            </span>
            <button
              type="button"
              className={arrowClass}
              aria-label="Keyingi sahifa"
              disabled={page.page >= page.pageCount || loading}
              onClick={() => goTo(page.page + 1)}
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </nav>
        </div>
      )}

      <AlertDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) setRevoking(null);
        }}
        onCloseAutoFocus={(event) => {
          // The row is gone after a sign-out: focus the section's title.
          event.preventDefault();
          titleRef.current?.focus();
        }}
        title="Seansni tugatasizmi?"
        description={
          revoking && (
            <p className="m-0 text-[14px] leading-5 text-ink">
              <b>{sessionLabel(revoking)}</b> hisobdan chiqariladi: mijoz u yerda qayta kirishi
              kerak bo‘ladi. Qolgan qurilmalar o‘zgarmaydi. Amal sizning nomingizdan jurnalga
              yoziladi.
            </p>
          )
        }
      >
        {revokeError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {revokeError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirmRevoke} disabled={busy} aria-busy={busy}>
            {busy ? "Tugatilmoqda…" : "Seansni tugatish"}
          </Button>
        </div>
      </AlertDialog>
    </Card>
  );
}
