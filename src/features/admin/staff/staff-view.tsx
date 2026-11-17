"use client";

import type { Route } from "next";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { ActionMenu, SelectMenu, type ActionMenuItem } from "@/components/ui/menu";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { sendStaffPasswordLink, setStaffActive } from "@/data/staff.actions";
import type { ActionResult, Page } from "@/data/types";
import {
  STAFF_PAGE_SIZES,
  resendBlock,
  type StaffAccountRow,
  type StaffCredentials,
  type StaffListQuery,
  type StaffStatus,
} from "@/domain/staff";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { ListTransition, useListNavigation } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import { staffCopy } from "./copy";
import { CredentialsDialog, type ShownCredentials } from "./credentials-dialog";
import type { ResetStaffMfaAction } from "./mfa-hook";
import { resetMfaCopy } from "./reset-mfa-copy";
import { ResetMfaDialog } from "./reset-mfa-dialog";
import { staffListHref } from "./query";
import { StaffBadges } from "./staff-badges";
import { EditDialog, InviteDialog, ResetDialog } from "./staff-dialogs";

const PROVIDER_LABEL: Record<string, string> = { google: "Google", facebook: "Facebook" };

type ConfirmKind = "deactivate" | "reactivate" | "resend" | "resetMfa";
type Confirm = { kind: ConfirmKind; row: StaffAccountRow };

interface StaffViewProps {
  page: Page<StaffAccountRow>;
  query: StaffListQuery;
  /** The signed-in manager: their own row offers no role, deactivate, reset or link action. */
  selfId: string;
  /** `capabilities.staff_email_invite`: the e-mailed link options work. */
  emailInvite: boolean;
  /** "Now" of the data source (the demo's fixed instant in mock mode), for the link badges. */
  nowMs: number;
  eyebrow: string;
  /**
   * «MFA ni o‘chirish» (`POST staff/{id}/reset-mfa/`): wired by the MFA work. Without it the menu
   * item is not shown.
   */
  resetMfa?: ResetStaffMfaAction;
}

/**
 * Xodimlar (gap FND-4, contract §2.16, §7 item 20, DESIGN §E): the staff accounts with search and
 * the «Faol» / «Nofaol» tabs, badges for the password and MFA state; «Yangi xodim» invites one
 * with a «Kirish usuli» (temporary password, e-mailed link or both) and shows the temporary
 * password once; each row edits the name and manager role, resets the password (same choice),
 * resends the link, deactivates or reactivates — every irreversible step behind a confirmation.
 * The server's refusals (own account, last active manager, superuser, no e-mail) show as they come.
 */
export function StaffView(props: StaffViewProps) {
  const { page, query, selfId, emailInvite, nowMs, eyebrow, resetMfa } = props;
  const t = useCopy(staffCopy);
  const resetMfaText = useCopy(resetMfaCopy);
  const fmt = useFormat();
  const toast = useToast();
  const [source, setSource] = useState(page);
  const [rows, setRows] = useState(page.items);
  if (page !== source) {
    setSource(page);
    setRows(page.items);
  }
  const replace = (row: StaffAccountRow) =>
    setRows((current) => current.map((r) => (r.id === row.id ? row : r)));

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteInstance, setInviteInstance] = useState(0);
  const inviteKey = useIdempotencyKey();
  const [editing, setEditing] = useState<StaffAccountRow | null>(null);
  const [editInstance, setEditInstance] = useState(0);
  const editKey = useIdempotencyKey();
  const [resetting, setResetting] = useState<StaffAccountRow | null>(null);
  const resetKey = useIdempotencyKey();
  const [lastReset, setLastReset] = useState<string | null>(null);
  const [resetInstance, setResetInstance] = useState(0);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmShown, setConfirmShown] = useState<Confirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmInFlight = useRef(false);
  const confirmKey = useIdempotencyKey();
  // The one-time password: kept in memory only while its dialog is open.
  const [credentials, setCredentials] = useState<ShownCredentials | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  // «MFA ni o‘chirish»: its own dialog (optional reason), one instance per opening.
  const [resettingMfa, setResettingMfa] = useState<StaffAccountRow | null>(null);
  const [resetMfaInstance, setResetMfaInstance] = useState(0);

  const openConfirm = (next: Confirm) => {
    // A different action or account needs a key of its own.
    if (!confirmShown || confirmShown.kind !== next.kind || confirmShown.row.id !== next.row.id) {
      confirmKey.renew();
    }
    setConfirmError(null);
    setConfirmShown(next);
    setConfirm(next);
  };

  const openReset = (row: StaffAccountRow) => {
    // A reset of another account (or after a finished one) needs a key of its own.
    if (lastReset !== row.id) resetKey.renew();
    setLastReset(row.id);
    setResetInstance((n) => n + 1);
    setResetting(row);
  };

  const runConfirm = async () => {
    const target = confirm;
    if (!target || confirmInFlight.current) return;
    confirmInFlight.current = true;
    setConfirmBusy(true);
    setConfirmError(null);
    const { row } = target;
    let result: ActionResult<StaffAccountRow | StaffCredentials>;
    if (target.kind === "resend") {
      result = await runAction((csrf) => sendStaffPasswordLink(row.id, confirmKey.key, csrf, row));
    } else if (target.kind === "resetMfa" && resetMfa) {
      result = await runAction((csrf) => resetMfa(row.id, confirmKey.key, csrf, row));
    } else {
      const active = target.kind === "reactivate";
      result = await runAction((csrf) => setStaffActive(row.id, active, confirmKey.key, csrf, row));
    }
    result = confirmKey.settle(result);
    confirmInFlight.current = false;
    setConfirmBusy(false);
    if (!result.ok) return setConfirmError(result.error);
    setConfirm(null);
    if (target.kind === "resend") {
      const data = result.data as StaffCredentials;
      replace(data.staff);
      setCredentials({ kind: "resent", data });
      return;
    }
    const updated = result.data as StaffAccountRow;
    if (target.kind === "resetMfa") {
      replace(updated);
    } else {
      // The row leaves this tab (it is listed under the other one now).
      setRows((current) => current.filter((r) => r.id !== updated.id));
    }
    toast({
      tone: "success",
      title: t.confirm[target.kind].done,
      description: updated.displayName,
    });
  };

  const menuItems = (row: StaffAccountRow): ActionMenuItem[] => {
    const self = row.id === selfId;
    const items: ActionMenuItem[] = [
      {
        key: "edit",
        label: t.menu.edit,
        onSelect: () => {
          setEditInstance((n) => n + 1);
          setEditing(row);
        },
      },
    ];
    if (self) {
      // One's own MFA is turned off in Settings (the backend refuses it here with 409).
      if (resetMfa && row.mfaEnabled) {
        items.push({
          key: "reset-mfa",
          label: t.menu.resetMfa,
          disabledReason: resetMfaText.selfReason,
          onSelect: () => undefined,
        });
      }
      return items;
    }
    items.push({ key: "reset", label: t.menu.resetPassword, onSelect: () => openReset(row) });
    if (row.isActive && (row.mustChangePassword || row.invite?.state === "pending")) {
      const block = resendBlock(row, selfId, emailInvite);
      items.push({
        key: "resend",
        label: t.menu.resendLink,
        disabledReason: block ? t.resendBlocked[block] : null,
        onSelect: () => openConfirm({ kind: "resend", row }),
      });
    }
    if (resetMfa && row.mfaEnabled) {
      items.push({
        key: "reset-mfa",
        label: t.menu.resetMfa,
        onSelect: () => {
          setResetMfaInstance((n) => n + 1);
          setResettingMfa(row);
        },
      });
    }
    items.push(
      row.isActive
        ? {
            key: "deactivate",
            label: t.menu.deactivate,
            onSelect: () => openConfirm({ kind: "deactivate", row }),
          }
        : {
            key: "reactivate",
            label: t.menu.reactivate,
            onSelect: () => openConfirm({ kind: "reactivate", row }),
          },
    );
    return items;
  };

  const shown = confirm ?? confirmShown;
  const range =
    page.total === 0
      ? "0 / 0"
      : `${fmt.number((page.page - 1) * page.pageSize + 1)}–${fmt.number(
          Math.min(page.total, page.page * page.pageSize),
        )} / ${fmt.number(page.total)}`;

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={t.title}
        actions={
          <Button
            ref={addButton}
            onClick={() => {
              setInviteInstance((n) => n + 1);
              setInviteOpen(true);
            }}
          >
            <Icon name="plus" size={18} />
            {t.add}
          </Button>
        }
      />

      <ListTransition className="group">
        <section
          aria-label={t.list}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <StaffToolbar query={query} />
          {rows.length > 0 ? (
            <ScrollRegion label={t.table}>
              <table className="data-table min-w-[960px] transition-opacity duration-150 group-data-[pending]:opacity-60">
                <caption className="sr-only">{t.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.columns.staff}</th>
                    <th scope="col">{t.columns.role}</th>
                    <th scope="col">{t.columns.lastLogin}</th>
                    <th scope="col">{t.columns.social}</th>
                    <th scope="col">{t.columns.created}</th>
                    <th scope="col">{t.columns.status}</th>
                    <th scope="col">
                      <span className="sr-only">{t.columns.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} data-staff-row={row.id}>
                      <td>
                        <span className="flex flex-col gap-1.5">
                          <span className="flex flex-col">
                            <span className="font-bold text-ink">
                              {row.displayName}
                              {row.id === selfId && (
                                <span className="font-normal text-ink-muted"> {t.you}</span>
                              )}
                            </span>
                            <span className="text-[12px] text-ink-muted">{row.email}</span>
                          </span>
                          <StaffBadges row={row} nowMs={nowMs} />
                        </span>
                      </td>
                      <td>
                        <Badge tone={row.isManager ? "gold" : "neutral"} dot={false}>
                          {row.isManager ? t.roles.manager : t.roles.staff}
                        </Badge>
                      </td>
                      <td className="text-ink-muted tabular-nums">
                        {row.lastLoginAt ? (
                          <time dateTime={row.lastLoginAt}>
                            {fmt.dateTimeShort(row.lastLoginAt)}
                          </time>
                        ) : (
                          t.neverSignedIn
                        )}
                      </td>
                      <td>
                        {row.linkedProviders.length > 0
                          ? row.linkedProviders.map((p) => PROVIDER_LABEL[p] ?? p).join(", ")
                          : t.none}
                      </td>
                      <td className="text-ink-muted tabular-nums">
                        {row.createdAt ? fmt.dateTimeShort(row.createdAt) : t.none}
                      </td>
                      <td>
                        {row.isActive ? (
                          <Badge tone="success">{t.status.active}</Badge>
                        ) : (
                          <Badge tone="muted">{t.status.inactive}</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <ActionMenu
                          label={t.menu.label(row.displayName)}
                          triggerClassName="inline-flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
                          trigger={
                            <>
                              <span className="sr-only">{t.menu.label(row.displayName)}</span>
                              <Icon name="sliders" size={18} />
                            </>
                          }
                          items={menuItems(row)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="users" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">{t.empty.title}</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {query.q
                  ? t.empty.search
                  : query.status === "inactive"
                    ? t.empty.inactive
                    : t.empty.first}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">{range}</span>
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={(p): Route => staffListHref({ ...query, page: p })}
            />
            <StaffPageSizeMenu query={query} />
          </div>
        </section>
      </ListTransition>

      <InviteDialog
        key={`invite-${inviteInstance}`}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        idempotency={inviteKey}
        emailInvite={emailInvite}
        onInvited={(data) => {
          if (query.status === "active" && query.page === 1) {
            setRows((current) =>
              [...current.filter((r) => r.id !== data.staff.id), data.staff].sort((a, b) =>
                a.displayName.localeCompare(b.displayName, "uz"),
              ),
            );
          }
          setCredentials({ kind: "invited", data });
        }}
      />

      {editing && (
        <EditDialog
          key={`edit-${editInstance}`}
          row={editing}
          self={editing.id === selfId}
          idempotency={editKey}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            replace(row);
            toast({ tone: "success", title: t.edit.saved, description: row.displayName });
          }}
        />
      )}

      {resetting && (
        <ResetDialog
          key={`reset-${resetInstance}`}
          row={resetting}
          idempotency={resetKey}
          emailInvite={emailInvite}
          onClose={() => setResetting(null)}
          onDone={(data) => {
            // The next reset of this account is a new request.
            setLastReset(null);
            replace(data.staff);
            setCredentials({ kind: "reset", data });
          }}
        />
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (confirmBusy) return;
          if (!open) setConfirm(null);
        }}
        onCloseAutoFocus={(event) => {
          // A deactivated or reactivated row left the table: focus the add button.
          if (!rows.some((r) => r.id === confirmShown?.row.id)) {
            event.preventDefault();
            addButton.current?.focus();
          }
        }}
        title={shown ? t.confirm[shown.kind].title : ""}
        description={
          shown && (
            <span className="flex flex-col gap-1.5 text-[14px] leading-5 text-ink">
              <span className="font-semibold">
                {shown.row.displayName} · {shown.row.email}
              </span>
              <span>{t.confirm[shown.kind].body}</span>
            </span>
          )
        }
      >
        {confirmError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            <span>
              <span className="sr-only">{`${t.common.failed}: `}</span>
              {confirmError}
            </span>
          </p>
        )}
        <div className="mt-1.5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabledReason={confirmBusy && t.common.busy}
            onClick={() => setConfirm(null)}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant={
              shown?.kind === "reactivate" || shown?.kind === "resend" ? "primary" : "destructive"
            }
            onClick={runConfirm}
            busy={confirmBusy}
          >
            {confirmBusy ? t.common.working : shown ? t.confirm[shown.kind].action : ""}
          </Button>
        </div>
      </AlertDialog>

      {resettingMfa && resetMfa ? (
        <ResetMfaDialog
          key={`reset-mfa-${resetMfaInstance}`}
          row={resettingMfa}
          action={resetMfa}
          onClose={() => setResettingMfa(null)}
          onDone={(row) => {
            replace(row);
            setResettingMfa(null);
          }}
        />
      ) : null}

      <CredentialsDialog shown={credentials} onClose={() => setCredentials(null)} />
    </>
  );
}

/** Search (full name or email, debounced) and the «Faol» / «Nofaol» tabs. */
function StaffToolbar({ query }: { query: StaffListQuery }) {
  const t = useCopy(staffCopy);
  const { navigate } = useListNavigation();
  const [search, setSearch] = useState(query.q ?? "");
  const lastSubmitted = useRef(query.q ?? "");

  useEffect(() => {
    const term = search.trim();
    if (term === lastSubmitted.current) return;
    const timer = window.setTimeout(() => {
      lastSubmitted.current = term;
      navigate(staffListHref({ ...query, q: term || undefined, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query, navigate]);

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SegmentedControl<StaffStatus>
        label={t.status.label}
        value={query.status}
        onChange={(status) => navigate(staffListHref({ ...query, status, page: 1 }))}
        options={[
          { value: "active", label: t.status.active },
          { value: "inactive", label: t.status.inactive },
        ]}
      />
      <SearchInput
        label={t.search}
        placeholder={t.search}
        value={search}
        maxLength={64}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
    </div>
  );
}

function StaffPageSizeMenu({ query }: { query: StaffListQuery }) {
  const t = useCopy(staffCopy);
  const { navigate } = useListNavigation();
  return (
    <SelectMenu<string>
      label={t.pageSize}
      align="end"
      trigger={t.rows(query.pageSize)}
      triggerClassName="h-9 gap-1.5 px-3 text-[13px] leading-[18px] font-semibold"
      value={String(query.pageSize)}
      onValueChange={(value) =>
        navigate(
          staffListHref({
            ...query,
            pageSize: Number(value) as StaffListQuery["pageSize"],
            page: 1,
          }),
        )
      }
      options={STAFF_PAGE_SIZES.map((size) => ({ value: String(size), label: t.rows(size) }))}
    />
  );
}
