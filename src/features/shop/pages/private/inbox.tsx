import type { Metadata } from "next";
import { Suspense } from "react";

import { getInbox } from "@/data/shop/account";
import { privateRead } from "@/data/shop/private";
import type { Locale } from "@/lib/i18n/locales";

import { AccountShell, BodySkeleton, Pager, privateMetadata } from "../../account/account-shell";
import { inboxCopy } from "../../copy/inbox";
import { InboxList } from "../../inbox/inbox-list";
import { shopHref } from "../../routing/routes";
import { pageNumber, privateGate, type LocaleInput, type SearchParams } from "./shared";

/** `/xabarlar` · `/{ru,en}/inbox` — the notifications inbox (private). */

export async function inboxMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "inbox" }, inboxCopy[locale].title);
}

async function InboxBody({ locale, searchParams }: { locale: Locale; searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const next = shopHref(locale, { kind: "inbox" }, { page: page > 1 ? page : undefined });
  await privateGate(locale, next);
  const inbox = await privateRead(next, () => getInbox(locale, page));
  return (
    <>
      <InboxList key={page} locale={locale} items={inbox.page.items} unread={inbox.unread} />
      <Pager
        locale={locale}
        page={inbox.page.page}
        pageCount={inbox.page.pageCount}
        hrefFor={(n) => shopHref(locale, { kind: "inbox" }, { page: n > 1 ? n : undefined })}
      />
    </>
  );
}

export async function InboxPage({
  locale: localeInput,
  searchParams,
}: {
  locale: LocaleInput;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  const copy = inboxCopy[locale];
  return (
    <AccountShell locale={locale} section="inbox" title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <InboxBody locale={locale} searchParams={searchParams} />
      </Suspense>
    </AccountShell>
  );
}
