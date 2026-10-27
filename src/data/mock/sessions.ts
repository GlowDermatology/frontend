import type { Customer, CustomerSession } from "@/domain/customer";

/**
 * Mock «Faol seanslar» (contract §2.6 `customers/{id}/sessions/`, B-W1): a
 * session per active app installation, plus browser sessions for the
 * design customer (Malika Karimova, id 5) and enough of them for customer 1
 * to show the second page. A deleted customer has none. Ids are stable
 * UUID-shaped strings, so a sign-out can be checked against the fixture.
 */

const t = (local: string) => `${local}+05:00`;
const uuid = (customerId: string, index: number) =>
  `00000000-0000-4000-8000-${customerId.padStart(6, "0")}${String(index).padStart(6, "0")}`;

const BROWSERS: ReadonlyArray<[device: string, location: string]> = [
  ["Chrome (Windows)", "Tashkent, Tashkent, UZ"],
  ["Safari (macOS)", "Samarkand, Samarqand Region, UZ"],
  ["Firefox (Linux)", "—"],
  ["Edge (Windows)", "Tashkent, Tashkent, UZ"],
  ["Safari (iOS)", "Bukhara, Bukhara Region, UZ"],
  ["Chrome (Android)", "Namangan, Namangan Region, UZ"],
];

export function mockCustomerSessions(customer: Customer): CustomerSession[] {
  if (customer.status === "deleted") return [];
  const sessions: CustomerSession[] = customer.devices
    .filter((device) => device.isActive)
    .map((device, index) => ({
      id: uuid(customer.id, index + 1),
      device:
        device.platform === "web"
          ? `${device.model} (${device.os})`
          : `Glow Derma ${device.platform === "ios" ? "iOS" : "Android"} (${device.model})`,
      platform: device.platform,
      location: "Tashkent, Tashkent, UZ",
      createdAt: device.createdAt,
      updatedAt: device.lastActiveAt,
    }));
  const browsers = customer.id === "5" ? 1 : customer.id === "1" ? 22 : 0;
  for (let index = 0; index < browsers; index++) {
    // Malika's Chrome is her web device above: her extra browser starts at Safari.
    const [device, location] = BROWSERS[(index + 1) % BROWSERS.length]!;
    const day = String(23 - Math.floor(index / 2)).padStart(2, "0");
    const hour = String(20 - (index % 2) * 6).padStart(2, "0");
    sessions.push({
      id: uuid(customer.id, 100 + index),
      device,
      platform: "web",
      location,
      createdAt: t(`2026-09-${day}T10:00:00`),
      updatedAt: t(`2026-10-${day}T${hour}:30:00`),
    });
  }
  return sessions.sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
  );
}
