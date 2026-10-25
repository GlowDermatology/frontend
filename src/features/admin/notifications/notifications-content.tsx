import { requireStaff } from "@/data/auth";
import { getCustomer } from "@/data/customers";
import { getNotificationsOverview } from "@/data/notifications";
import { requestNow } from "@/data/now";

import { firstParam, type SearchParams } from "../shared/url-state";
import { NotificationsView } from "./notifications-view";
import { TemplatesSection } from "./templates-section";

export async function NotificationsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const customerId = firstParam(await searchParams, "customer");
  const [overview, customer, now] = await Promise.all([
    getNotificationsOverview(),
    customerId ? getCustomer(customerId) : null,
    requestNow(),
  ]);

  return (
    <>
      <NotificationsView
        history={overview.history}
        segments={overview.segments}
        totalDevices={overview.totalDevices}
        linkOptions={overview.linkOptions}
        defaultSchedule={overview.defaultSchedule}
        draft={overview.draft}
        recipient={customer ? { name: customer.name, phone: customer.phone } : null}
        now={now.toISOString()}
      />
      <TemplatesSection templates={overview.templates} />
    </>
  );
}
