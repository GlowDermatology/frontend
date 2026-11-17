"use client";

import { useRef, useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { loadCustomerSessions, revokeCustomerSession } from "@/data/customers.actions";
import type { Page } from "@/data/types";
import { customerDataCopy } from "@/domain/copy/customers";
import type { CustomerSession } from "@/domain/customer";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { pageRangeText } from "../specialists/form-kit";
import { customersCopy } from "./copy";
import { sessionLabel } from "./labels";

interface SessionsSectionProps {
  customerId: string;
  /** The first page, read with the card (`null`: the list could not be read). */
  initial: Page<CustomerSession> | null;
  /** A deleted customer has no sessions: the section explains why. */
  deleted: boolean;
}

/**
 * «Faol seanslar» (contract §2.6, B-W1): every phone and browser the
 * customer is signed in on, most recently active first, 20 per page. Staff
 * can sign one out («Seansni tugatish», behind a confirmation); the server
 * records it in the audit log (`customer.session_revoked`, actor = the
 * staff member) and the customer's client is signed out on its next request.
 */
export function SessionsSection({ customerId, initial, deleted }: SessionsSectionProps) {
  const t = useCopy(customersCopy).sessions;
  const platforms = useCopy(customerDataCopy).platform;
  const fmt = useFormat();
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
      toast({ tone: "danger", title: t.loadFailed, description: result.error });
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
      toast({ tone: "danger", title: t.failed, description: result.error });
      return;
    }
    setPage(result.data.sessions);
    setRevoking(null);
    if (result.data.revoked) {
      toast({
        tone: "success",
        title: t.revoked,
        description: t.revokedText(sessionLabel(target)),
      });
    } else {
      toast({
        tone: "info",
        title: t.alreadyEnded,
        description: t.alreadyEndedText(sessionLabel(target)),
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
            {t.title}
          </span>
        </CardTitle>
        {page && total > 0 && (
          <span className="text-caption font-normal text-ink-muted tabular-nums">
            {t.count(total, fmt.number(total))}
          </span>
        )}
      </div>

      {!page ? (
        <p role="alert" className="m-0 px-5 pb-5 text-body-sm text-ink-muted">
          {t.unreadable}
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-8 text-center">
          <Icon name="monitor" size={28} className="text-ink-muted" />
          <p className="m-0 text-body-sm font-semibold text-ink">{t.emptyTitle}</p>
          <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
            {deleted ? t.emptyDeleted : t.emptyActive}
          </p>
        </div>
      ) : (
        <ScrollRegion label={t.tableLabel}>
          <table
            className={`data-table min-w-[760px] transition-opacity duration-150 ${loading ? "opacity-60" : ""}`}
            aria-busy={loading}
          >
            <caption className="sr-only">{t.caption}</caption>
            <thead className="uppercase">
              <tr>
                <th scope="col">{t.device}</th>
                <th scope="col">{t.platform}</th>
                <th scope="col">{t.location}</th>
                <th scope="col">{t.created}</th>
                <th scope="col">{t.updated}</th>
                <th scope="col">
                  <span className="sr-only">{t.action}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-session-id={row.id}>
                  <td className="font-semibold">
                    <span className="flex max-w-[280px] items-center gap-2 break-words">
                      <Icon
                        name={row.platform === "web" ? "monitor" : "smartphone"}
                        size={18}
                        className="shrink-0 text-gold-ink"
                      />
                      {row.device}
                    </span>
                  </td>
                  <td>{row.platform ? platforms[row.platform] : "—"}</td>
                  <td className="max-w-[220px] break-words text-ink-muted!">{row.location}</td>
                  <td className="whitespace-nowrap text-ink-muted! tabular-nums">
                    <time dateTime={row.createdAt}>{fmt.dateTimeShort(row.createdAt)}</time>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    <time dateTime={row.updatedAt}>{fmt.dateTimeShort(row.updatedAt)}</time>
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRevokeError(null);
                        setRevoking(row);
                      }}
                      aria-label={t.revokeOf(sessionLabel(row))}
                    >
                      <Icon name="logout" size={16} />
                      {t.revoke}
                    </Button>
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
            {pageRangeText(fmt, page.page, page.pageSize, total)}
          </span>
          {loadError && (
            <span role="alert" className="text-body-sm font-semibold text-ink">
              {loadError}
            </span>
          )}
          <nav aria-label={t.pagesLabel} className="flex items-center gap-1">
            <IconButton
              variant="outline"
              size="sm"
              aria-label={t.previous}
              busy={loading}
              disabledReason={page.page <= 1 && t.firstPage}
              onClick={() => goTo(page.page - 1)}
            >
              <Icon name="chevron-left" size={18} />
            </IconButton>
            <span className="px-2 text-body-sm font-semibold text-ink tabular-nums">
              {fmt.number(page.page)} / {fmt.number(page.pageCount)}
            </span>
            <IconButton
              variant="outline"
              size="sm"
              aria-label={t.next}
              busy={loading}
              disabledReason={page.page >= page.pageCount && t.lastPage}
              onClick={() => goTo(page.page + 1)}
            >
              <Icon name="chevron-right" size={18} />
            </IconButton>
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
        title={t.confirmTitle}
        description={
          revoking && (
            <p className="m-0 text-[14px] leading-5 text-ink">
              <b>{sessionLabel(revoking)}</b> {t.confirmText}
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
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={busy && t.busyReason}>
              {t.cancel}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirmRevoke} busy={busy}>
            {busy ? t.revoking : t.revoke}
          </Button>
        </div>
      </AlertDialog>
    </Card>
  );
}
