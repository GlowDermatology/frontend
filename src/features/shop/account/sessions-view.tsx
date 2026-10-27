"use client";

import { DropdownMenu } from "radix-ui";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { revokeOtherSessions, revokeSession } from "@/data/shop/account.actions";
import type { ShopSession } from "@/domain/shop-account";
import { formatDateTime, formatShortDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { accountCopy } from "../copy/account";
import { commonCopy } from "../copy/common";
import { shopPath } from "../routing/routes";
import { readShopCsrf } from "../shared/action-client";
import { FormAlert, FormNote } from "./controls";
import { failureText, useShopAction } from "./use-shop-action";

/**
 * «Faol seanslar» (backend B-W1), modelled on an "Active sessions" screen: a
 * table Device · Location · Created · Updated with a «Joriy» badge on this
 * browser and a row ⋯ menu «Chiqish», plus «Boshqa qurilmalardan chiqish»
 * and «Hamma joydan chiqish» behind confirmations. Below the `md` width the
 * rows become stacked cards. Signing out this browser (its row, or
 * everywhere) clears the cookies and returns to the home page.
 */

type Confirm = { kind: "one"; session: ShopSession } | { kind: "others" } | { kind: "all" };

export function SessionsView({ locale, initial }: { locale: Locale; initial: ShopSession[] }) {
  const copy = accountCopy[locale].sessions;
  const [sessions, setSessions] = useState(initial);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { run, pending, error } = useShopAction(locale);
  const logoutForm = useRef<HTMLFormElement>(null);
  const logoutCsrf = useRef<HTMLInputElement>(null);
  const home = shopPath(locale, { kind: "home" });
  const others = sessions.filter((session) => !session.current).length;

  const proceed = async () => {
    if (!confirm) return;
    if (confirm.kind === "all") {
      if (logoutCsrf.current) logoutCsrf.current.value = readShopCsrf();
      logoutForm.current?.requestSubmit();
      return;
    }
    if (confirm.kind === "others") {
      const result = await run((csrf) => revokeOtherSessions({ locale, csrf }));
      setConfirm(null);
      if (result.ok) {
        setSessions((current) => current.filter((session) => session.current));
        setNotice(copy.revokedOthers(result.data.revoked));
      }
      return;
    }
    const target = confirm.session;
    const result = await run((csrf) =>
      revokeSession({ locale, id: target.id, current: target.current, csrf }),
    );
    setConfirm(null);
    if (!result.ok) return;
    if (result.data.signedOut) {
      window.location.assign(home);
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== target.id));
    setNotice(copy.revoked);
  };

  const deviceIcon = (session: ShopSession) => (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
      <Icon
        name={session.platform === "web" || session.platform === null ? "monitor" : "smartphone"}
        size={20}
      />
    </span>
  );

  const rowMenu = (session: ShopSession) => (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={copy.rowMenu(session.device)}
        className="flex size-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-gold-soft hover:text-ink data-[state=open]:bg-gold-soft"
      >
        <Icon name="more" size={20} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={6}
        collisionPadding={8}
        className="z-50 min-w-[160px] rounded-md border border-line bg-surface-raised p-1.5 shadow-lg data-[state=open]:animate-pop-in"
      >
        <DropdownMenu.Item
          onSelect={() => setConfirm({ kind: "one", session })}
          className="flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-label text-ink outline-none select-none data-[highlighted]:bg-gold-soft"
        >
          <Icon name="logout" size={18} className="text-ink-muted" />
          {copy.signOut}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );

  const deviceLabel = (session: ShopSession) => (
    <span className="flex min-w-0 flex-col">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-label text-ink">{session.device}</span>
        {session.current ? <Badge tone="success">{copy.current}</Badge> : null}
      </span>
      {/* Platform and sign-in time: two "Veb-brauzer (Linux)" rows stay tellable apart. */}
      <span className="text-caption text-ink-muted">
        {[
          session.platform ? copy.platform[session.platform] : null,
          formatShortDateTime(session.createdAt, locale),
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </span>
  );

  const dialog =
    confirm?.kind === "all"
      ? { title: copy.allTitle, body: copy.allBody, action: copy.allConfirm }
      : confirm?.kind === "others"
        ? { title: copy.othersTitle, body: copy.othersBody, action: copy.othersConfirm }
        : confirm?.kind === "one"
          ? {
              title: copy.oneTitle,
              body: confirm.session.current
                ? copy.oneCurrentBody
                : copy.oneBody(confirm.session.device),
              action: copy.oneConfirm,
            }
          : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => setConfirm({ kind: "others" })}
          disabled={others === 0 || pending}
        >
          {copy.signOutOthers}
        </Button>
        <Button variant="danger" onClick={() => setConfirm({ kind: "all" })} disabled={pending}>
          {copy.signOutAll}
        </Button>
      </div>
      {notice ? <FormNote>{notice}</FormNote> : null}
      {error ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}

      {/* md and up: the table */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface-raised md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" className="uppercase">
                {copy.columns.device}
              </th>
              <th scope="col" className="uppercase">
                {copy.columns.location}
              </th>
              <th scope="col" className="uppercase">
                {copy.columns.created}
              </th>
              <th scope="col" className="uppercase">
                {copy.columns.updated}
              </th>
              <th scope="col">
                <span className="sr-only">{copy.signOut}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} aria-current={session.current ? "true" : undefined}>
                <td>
                  <span className="flex items-center gap-3">
                    {deviceIcon(session)}
                    {deviceLabel(session)}
                  </span>
                </td>
                <td>{session.location}</td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatDateTime(session.createdAt, locale)}
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatDateTime(session.updatedAt, locale)}
                </td>
                <td className="w-12 text-right">{rowMenu(session)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Below md: stacked cards */}
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4"
          >
            <div className="flex items-start gap-3">
              {deviceIcon(session)}
              <div className="min-w-0 flex-1">{deviceLabel(session)}</div>
              {rowMenu(session)}
            </div>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
              <dt className="text-ink-muted">{copy.columns.location}</dt>
              <dd className="m-0 text-ink">{session.location}</dd>
              <dt className="text-ink-muted">{copy.columns.created}</dt>
              <dd className="m-0 text-ink tabular-nums">
                {formatDateTime(session.createdAt, locale)}
              </dd>
              <dt className="text-ink-muted">{copy.columns.updated}</dt>
              <dd className="m-0 text-ink tabular-nums">
                {formatDateTime(session.updatedAt, locale)}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
      {others === 0 ? <p className="m-0 text-body-sm text-ink-muted">{copy.empty}</p> : null}

      <AlertDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={dialog?.title ?? ""}
        description={<p className="m-0 text-body text-ink-muted">{dialog?.body}</p>}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="secondary">{commonCopy[locale].dialog.cancel}</Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => void proceed()}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {dialog?.action}
          </Button>
        </div>
      </AlertDialog>
      <form ref={logoutForm} method="post" action="/api/shop/auth/logout" hidden>
        <input ref={logoutCsrf} type="hidden" name="csrf" defaultValue="" />
        <input type="hidden" name="scope" value="all" />
        <input type="hidden" name="next" value={home} />
      </form>
    </div>
  );
}
