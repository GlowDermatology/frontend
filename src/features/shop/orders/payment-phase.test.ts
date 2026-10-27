import { describe, expect, it } from "vitest";

import { qrDrawing } from "../loyalty/qr-matrix";
import { keepPolling, paymentPhase, POLL_WINDOW_MS } from "./payment-phase";

const order = (
  status: "awaiting_payment" | "processing" | "cancelled",
  payment: "pending" | "paid" | "failed",
  inProgress = false,
) => ({
  status,
  payment: { status: payment, statusLabel: "", provider: "click" as const, inProgress },
});

describe("paymentPhase", () => {
  it("is paid once the payment or the order says so", () => {
    expect(paymentPhase(order("processing", "pending"), 0)).toBe("paid");
    expect(paymentPhase(order("awaiting_payment", "paid"), 0)).toBe("paid");
  });

  it("keeps checking within the window, then gives up politely", () => {
    expect(paymentPhase(order("awaiting_payment", "pending"), 10_000)).toBe("checking");
    expect(keepPolling("checking")).toBe(true);
    expect(paymentPhase(order("awaiting_payment", "pending"), POLL_WINDOW_MS)).toBe("pending");
    expect(keepPolling("pending")).toBe(false);
  });

  it("reports a refusal only when nothing is in flight, and an expiry", () => {
    expect(paymentPhase(order("awaiting_payment", "failed"), 0)).toBe("failed");
    expect(paymentPhase(order("awaiting_payment", "failed", true), 0)).toBe("checking");
    expect(paymentPhase(order("cancelled", "failed"), 0)).toBe("expired");
  });
});

describe("qrDrawing", () => {
  it("draws a square matrix with a quiet zone", () => {
    const drawing = qrDrawing("GD1:3q2-7wEjRZ8nYlZTS3l6qg");
    // 26 bytes at ECC M → version 2 (25 modules) or 3 (29); plus 2 × 4 quiet modules.
    expect([33, 37]).toContain(drawing.size);
    expect(drawing.path.startsWith("M4 4h")).toBe(true); // the finder pattern's corner
    expect(qrDrawing("GD1:3q2-7wEjRZ8nYlZTS3l6qg")).toEqual(drawing);
  });
});
