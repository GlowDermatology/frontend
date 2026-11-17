import { orderLabelsCopy, type OrderLabels } from "@/domain/copy/orders";

/**
 * A customer's name as the order screens show it: the mapper writes the Uzbek token
 * `DELETED_CUSTOMER_NAME` (= `orderLabelsCopy.uz.deletedCustomer`, §7.16, shared with the payments
 * mapper) for a deleted customer; it is shown in the admin language.
 */
export function customerName(name: string, labels: OrderLabels): string {
  return name === orderLabelsCopy.uz.deletedCustomer || name.trim() === ""
    ? labels.deletedCustomer
    : name;
}
