import { describe, expect, it } from "vitest";

import { canAdjustCashback } from "@/domain/customer";

import { balanceNote } from "./labels";

describe("customer card copy", () => {
  it("never claims the balance is the ledger sum (the server's balance, §5.3)", () => {
    expect(balanceNote(0, 5680)).toBe("Band qilingan summa yo‘q");
    expect(balanceNote(0, 5680)).not.toMatch(/yig‘indi/);
    expect(balanceNote(1200, 4480)).toMatch(
      /^Band: 1\D200\Dso‘m · ishlatish mumkin: 4\D480\Dso‘m$/,
    );
  });

  it("keeps a deleted customer's card read-only", () => {
    expect(canAdjustCashback({ status: "active" })).toBe(true);
    expect(canAdjustCashback({ status: "deleted" })).toBe(false);
  });
});
