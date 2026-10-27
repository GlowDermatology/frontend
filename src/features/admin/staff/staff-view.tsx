"use client";

import type { Route } from "next";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, SearchInput, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { ActionMenu, SelectMenu } from "@/components/ui/menu";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { inviteStaff, resetStaffPassword, setStaffActive, updateStaff } from "@/data/staff.actions";
import { inviteStaffSchema, updateStaffSchema } from "@/data/staff.schema";
import type { Page } from "@/data/types";
import {
  STAFF_PAGE_SIZES,
  STAFF_ROLE_LABEL,
  TEMPORARY_PASSWORD_HINT,
  type StaffAccountRow,
  type StaffCredentials,
  type StaffListQuery,
  type StaffStatus,
} from "@/domain/staff";
import { formatDateTimeShort } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { ListTransition, useListNavigation } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import { staffListHref } from "./query";

const PROVIDER_LABEL: Record<string, string> = { google: "Google", facebook: "Facebook" };

type Confirm =
  | { kind: "deactivate"; row: StaffAccountRow }
  | { kind: "reactivate"; row: StaffAccountRow }
  | { kind: "reset"; row: StaffAccountRow };

interface StaffViewProps {
  page: Page<StaffAccountRow>;
  query: StaffListQuery;
  /** The signed-in manager: their own row offers no role, deactivate or reset action. */
  selfId: string;
  eyebrow: string;
}

/**
 * Xodimlar (gap FND-4, contract §2.16, §7 item 20): the staff accounts
 * with search and the «Faol» / «Nofaol» tabs; «Yangi xodim» invites one and
 * shows the temporary password once; each row edits the name and manager
 * role, deactivates or reactivates, or resets the password, every
 * irreversible step behind a confirmation. The server's refusals (own
 * account, last active manager, superuser) show as they come.
 */
export function StaffView({ page, query, selfId, eyebrow }: StaffViewProps) {
  return (
    <>
      <StaffBoard page={page} query={query} selfId={selfId} eyebrow={eyebrow} />
    </>
  );
}

function StaffBoard({ page, query, selfId, eyebrow }: StaffViewProps) {
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
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmShown, setConfirmShown] = useState<Confirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmInFlight = useRef(false);
  const confirmKey = useIdempotencyKey();
  // The one-time password: kept in memory only while its dialog is open.
  const [credentials, setCredentials] = useState<{
    title: string;
    data: StaffCredentials;
  } | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  const openConfirm = (next: Confirm) => {
    // A different action or account needs a key of its own.
    if (!confirmShown || confirmShown.kind !== next.kind || confirmShown.row.id !== next.row.id) {
      confirmKey.renew();
    }
    setConfirmError(null);
    setConfirmShown(next);
    setConfirm(next);
  };

  const runConfirm = async () => {
    const target = confirm;
    if (!target || confirmInFlight.current) return;
    confirmInFlight.current = true;
    setConfirmBusy(true);
    setConfirmError(null);
    if (target.kind === "reset") {
      const result = confirmKey.settle(
        await runAction((csrf) =>
          resetStaffPassword(target.row.id, confirmKey.key, csrf, target.row),
        ),
      );
      confirmInFlight.current = false;
      setConfirmBusy(false);
      if (!result.ok) return setConfirmError(result.error);
      setConfirm(null);
      replace(result.data.staff);
      setCredentials({ title: "Yangi vaqtinchalik parol", data: result.data });
      return;
    }
    const active = target.kind === "reactivate";
    const result = confirmKey.settle(
      await runAction((csrf) =>
        setStaffActive(target.row.id, active, confirmKey.key, csrf, target.row),
      ),
    );
    confirmInFlight.current = false;
    setConfirmBusy(false);
    if (!result.ok) return setConfirmError(result.error);
    setConfirm(null);
    // The row leaves this tab (it is listed under the other one now).
    setRows((current) => current.filter((r) => r.id !== result.data.id));
    toast({
      title: active ? "Xodim qayta faollashtirildi" : "Xodim faolsizlantirildi",
      description: result.data.displayName,
    });
  };

  const menuItems = (row: StaffAccountRow) => {
    const self = row.id === selfId;
    const items = [
      {
        key: "edit",
        label: "Tahrirlash",
        onSelect: () => {
          setEditInstance((n) => n + 1);
          setEditing(row);
        },
      },
    ];
    if (self) return items;
    items.push({
      key: "reset",
      label: "Parolni tiklash",
      onSelect: () => openConfirm({ kind: "reset", row }),
    });
    items.push(
      row.isActive
        ? {
            key: "deactivate",
            label: "Faolsizlantirish",
            onSelect: () => openConfirm({ kind: "deactivate", row }),
          }
        : {
            key: "reactivate",
            label: "Qayta faollashtirish",
            onSelect: () => openConfirm({ kind: "reactivate", row }),
          },
    );
    return items;
  };

  const shown = confirm ?? confirmShown;
  const confirmText: Record<Confirm["kind"], { title: string; body: string; action: string }> = {
    deactivate: {
      title: "Xodimni faolsizlantirasizmi?",
      body: "Uning barcha sessiyalari darhol tugatiladi va u tizimga kira olmaydi (parol ham, Google/Facebook ham). Hisob, menejerlik va bog‘langan kirishlar qayta faollashtirish uchun saqlanadi.",
      action: "Faolsizlantirish",
    },
    reactivate: {
      title: "Xodimni qayta faollashtirasizmi?",
      body: "Xodim yana o‘z paroli yoki bog‘langan hisobi bilan kira oladi.",
      action: "Qayta faollashtirish",
    },
    reset: {
      title: "Parolni tiklaysizmi?",
      body: "Joriy parol yangi vaqtinchalik parol bilan almashtiriladi va xodimning barcha sessiyalari tugatiladi. Yangi parol bir marta ko‘rsatiladi. Bu amalni qaytarib bo‘lmaydi.",
      action: "Parolni tiklash",
    },
  };

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Xodimlar"
        actions={
          <button
            type="button"
            ref={addButton}
            onClick={() => {
              setInviteInstance((n) => n + 1);
              setInviteOpen(true);
            }}
            className={buttonStyles()}
          >
            <Icon name="plus" size={18} />
            Yangi xodim
          </button>
        }
      />

      <ListTransition className="group">
        <section
          aria-label="Xodimlar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <StaffToolbar query={query} />
          {rows.length > 0 ? (
            <ScrollRegion label="Xodimlar jadvali">
              <table className="data-table min-w-[880px] transition-opacity duration-150 group-data-[pending]:opacity-60">
                <caption className="sr-only">Xodimlar</caption>
                <thead>
                  <tr>
                    <th scope="col">XODIM</th>
                    <th scope="col">ROL</th>
                    <th scope="col">OXIRGI KIRISH</th>
                    <th scope="col">IJTIMOIY KIRISH</th>
                    <th scope="col">YARATILGAN</th>
                    <th scope="col">HOLAT</th>
                    <th scope="col">
                      <span className="sr-only">Amallar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="flex flex-col">
                          <span className="font-bold text-ink">
                            {row.displayName}
                            {row.id === selfId && (
                              <span className="font-normal text-ink-muted"> (siz)</span>
                            )}
                          </span>
                          <span className="text-[12px] text-ink-muted">{row.email}</span>
                        </span>
                      </td>
                      <td>
                        <Badge tone={row.isManager ? "gold" : "neutral"} dot={false}>
                          {row.isManager ? STAFF_ROLE_LABEL.manager : STAFF_ROLE_LABEL.staff}
                        </Badge>
                      </td>
                      <td className="text-ink-muted tabular-nums">
                        {row.lastLoginAt ? (
                          <time dateTime={row.lastLoginAt}>
                            {formatDateTimeShort(row.lastLoginAt)}
                          </time>
                        ) : (
                          "Hali kirmagan"
                        )}
                      </td>
                      <td>
                        {row.linkedProviders.length > 0
                          ? row.linkedProviders.map((p) => PROVIDER_LABEL[p] ?? p).join(", ")
                          : "—"}
                      </td>
                      <td className="text-ink-muted tabular-nums">
                        {row.createdAt ? formatDateTimeShort(row.createdAt) : "—"}
                      </td>
                      <td>
                        {row.isActive ? (
                          <Badge tone="success">Faol</Badge>
                        ) : (
                          <Badge tone="muted">Nofaol</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <ActionMenu
                          label={`${row.displayName} — amallar`}
                          triggerClassName="inline-flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
                          trigger={
                            <>
                              <span className="sr-only">{`${row.displayName} — amallar`}</span>
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
              <p className="m-0 text-subheading text-ink">Xodim topilmadi</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {query.q
                  ? "Qidiruvni o‘zgartirib ko‘ring."
                  : query.status === "inactive"
                    ? "Faolsizlantirilgan xodimlar shu yerda ko‘rinadi."
                    : "«Yangi xodim» bilan birinchi hisobni yarating."}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total)}
            </span>
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
        onInvited={(data) => {
          if (query.status === "active" && query.page === 1) {
            setRows((current) =>
              [...current.filter((r) => r.id !== data.staff.id), data.staff].sort((a, b) =>
                a.displayName.localeCompare(b.displayName, "uz"),
              ),
            );
          }
          setCredentials({ title: "Xodim qo‘shildi", data });
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
            toast({ title: "Xodim saqlandi", description: row.displayName });
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
        title={shown ? confirmText[shown.kind].title : ""}
        description={
          shown && (
            <span className="flex flex-col gap-1.5 text-[14px] leading-5 text-ink">
              <span className="font-semibold">
                {shown.row.displayName} · {shown.row.email}
              </span>
              <span>{confirmText[shown.kind].body}</span>
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
            {confirmError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel
            disabled={confirmBusy}
            className={buttonStyles({ variant: "outline" })}
          >
            Bekor qilish
          </AlertDialogCancel>
          <Button
            variant={shown?.kind === "reactivate" ? "primary" : "destructive"}
            onClick={runConfirm}
            disabled={confirmBusy}
            aria-busy={confirmBusy}
          >
            {confirmBusy ? "Bajarilmoqda…" : shown ? confirmText[shown.kind].action : ""}
          </Button>
        </div>
      </AlertDialog>

      <PasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  );
}

/** Search (full name or email, debounced) and the «Faol» / «Nofaol» tabs. */
function StaffToolbar({ query }: { query: StaffListQuery }) {
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
        label="Holat"
        value={query.status}
        onChange={(status) => navigate(staffListHref({ ...query, status, page: 1 }))}
        options={[
          { value: "active", label: "Faol" },
          { value: "inactive", label: "Nofaol" },
        ]}
      />
      <SearchInput
        label="Ism yoki email"
        placeholder="Ism yoki email"
        value={search}
        maxLength={64}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
    </div>
  );
}

function StaffPageSizeMenu({ query }: { query: StaffListQuery }) {
  const { navigate } = useListNavigation();
  return (
    <SelectMenu<string>
      label="Sahifadagi qatorlar"
      align="end"
      trigger={`${query.pageSize} ta qator`}
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
      options={STAFF_PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} ta qator` }))}
    />
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink">
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {message}
    </p>
  );
}

function ManagerSwitch({
  checked,
  onChange,
  disabled,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  hint: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
      <span className="flex flex-col gap-0.5">
        <span className="text-label text-ink" aria-hidden="true">
          Menejer
        </span>
        <span id={`${id}-hint`} className="text-caption font-normal text-ink-muted">
          {hint}
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label="Menejer"
        aria-describedby={`${id}-hint`}
      />
    </div>
  );
}

const MANAGER_HINT = "Menejer xodimlarni qo‘shadi, faolsizlantiradi va parolini tiklaydi.";

function InviteDialog({
  open,
  onOpenChange,
  idempotency,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idempotency: ReturnType<typeof useIdempotencyKey>;
  onInvited: (data: StaffCredentials) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const focusInvalid = () =>
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const values = { email, fullName, isManager };
    const local = inviteStaffSchema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      focusInvalid();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => inviteStaff(values, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, ["email", "fullName", "isManager"]);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      focusInvalid();
      return;
    }
    onOpenChange(false);
    onInvited(result.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title="Yangi xodim"
      description="Hisob darhol faol bo‘ladi. Vaqtinchalik parol bir marta ko‘rsatiladi."
      className="max-w-[520px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" error={errors.email} hint="Xodim shu email bilan tizimga kiradi.">
          {(c) => (
            <TextInput
              {...c}
              type="email"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>
        <Field label="To‘liq ism" error={errors.fullName}>
          {(c) => (
            <TextInput
              {...c}
              autoComplete="off"
              maxLength={150}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          )}
        </Field>
        <ManagerSwitch checked={isManager} onChange={setIsManager} hint={MANAGER_HINT} />
        <FormError message={formError ?? errors.isManager ?? null} />
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={busy} aria-busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? "Qo‘shilmoqda…" : "Xodim qo‘shish"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditDialog({
  row,
  self,
  idempotency,
  onClose,
  onSaved,
}: {
  row: StaffAccountRow;
  self: boolean;
  idempotency: ReturnType<typeof useIdempotencyKey>;
  onClose: () => void;
  onSaved: (row: StaffAccountRow) => void;
}) {
  const baseline = { fullName: row.fullName, isManager: row.isManager };
  const [fullName, setFullName] = useState(row.fullName);
  const [isManager, setIsManager] = useState(row.isManager);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const inFlight = useRef(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const values = { fullName, isManager };
    const local = updateStaffSchema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) =>
        updateStaff(row.id, local.data, baseline, idempotency.key, csrf, row),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const split = partitionFieldErrors(result, ["fullName"]);
      setErrors(split.fieldErrors);
      setFormError(split.formError);
      return;
    }
    onSaved(result.data);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
      }}
      onCloseAutoFocus={() => onClose()}
      title="Xodimni tahrirlash"
      description={row.email}
      className="max-w-[520px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="To‘liq ism" error={errors.fullName}>
          {(c) => (
            <TextInput
              {...c}
              autoComplete="off"
              maxLength={150}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          )}
        </Field>
        <ManagerSwitch
          checked={isManager}
          onChange={setIsManager}
          disabled={self}
          hint={self ? "O‘zingizni menejerlikdan chiqara olmaysiz." : MANAGER_HINT}
        />
        <p className="m-0 flex items-start gap-1.5 text-caption font-normal text-ink-muted">
          <Icon name="lock" size={14} className="mt-px shrink-0" />
          Emailni o‘zgartirib bo‘lmaydi: kerak bo‘lsa, yangi xodim qo‘shing.
        </p>
        <FormError message={formError} />
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={busy} aria-busy={busy}>
            <Icon name="check" size={18} />
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * The temporary password, shown once with a copy button (contract §7 item
 * 20). It lives in this dialog's props only and is dropped on close.
 */
function PasswordDialog({
  credentials,
  onClose,
}: {
  credentials: { title: string; data: StaffCredentials } | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const password = credentials?.data.temporaryPassword ?? null;

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast({ title: "Parol nusxalandi" });
    } catch {
      toast({
        tone: "info",
        title: "Nusxa olib bo‘lmadi",
        description: "Parolni belgilab, qo‘lda nusxalang.",
      });
    }
  };

  return (
    <Dialog
      open={credentials !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
      title={credentials?.title ?? ""}
      description={
        credentials
          ? `${credentials.data.staff.displayName} · ${credentials.data.staff.email}`
          : undefined
      }
      className="max-w-[520px]"
    >
      {password ? (
        <div className="flex flex-col gap-3">
          <span className="text-label text-ink" id="temporary-password-label">
            Vaqtinchalik parol
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <output
              aria-labelledby="temporary-password-label"
              data-testid="temporary-password"
              className="flex min-h-11 min-w-[200px] flex-1 items-center rounded-md bg-surface px-3.5 py-2 font-mono text-[16px] tracking-wide break-all text-ink select-all"
            >
              {password}
            </output>
            <Button variant="secondary" onClick={copy}>
              <Icon name={copied ? "check" : "receipt"} size={18} />
              {copied ? "Nusxalandi" : "Nusxa olish"}
            </Button>
          </div>
          <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
            {TEMPORARY_PASSWORD_HINT} Bu parol qayta ko‘rsatilmaydi.
          </p>
        </div>
      ) : (
        <p className="m-0 text-body-sm text-ink">
          Parolni ko‘rsatib bo‘lmadi. Parolni qayta tiklang.
        </p>
      )}
      <div className="flex justify-end">
        <DialogClose className={buttonStyles()}>Tayyor</DialogClose>
      </div>
    </Dialog>
  );
}
