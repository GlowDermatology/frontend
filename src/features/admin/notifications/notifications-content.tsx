import { getCustomer } from "@/data/customers";
import { getNotificationsOverview } from "@/data/notifications";

import { firstParam, type SearchParams } from "../shared/url-state";
import { NotificationsView } from "./notifications-view";
import { TemplatesSection } from "./templates-section";

export async function NotificationsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const customerId = firstParam(await searchParams, "customer");
  const [overview, customer] = await Promise.all([
    getNotificationsOverview(),
    customerId ? getCustomer(customerId) : null,
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
      />
      <TemplatesSection templates={overview.templates} />
    </>
  );
}
