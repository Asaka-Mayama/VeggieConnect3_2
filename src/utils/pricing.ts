// VeggieConnect pricing model — Admin commission on the buyer market.
//
// The per-kg amount a buyer sees in the Market is the farmer's asking price
// PLUS the Admin's per-kg commission (10%). The commission is the Admin's
// share for running the central market: sourcing, inspection, stocking and
// fulfillment. Farmers always keep their full asking price — it is shown
// untouched on the farmer's own dashboard and in admin procurement flows.

/** Admin commission added on top of every per-kg market price (10%). */
export const ADMIN_COMMISSION_RATE = 0.10;

/** Parses a price that may arrive as a number or a MySQL DECIMAL string. */
export function parseUnitPrice(value: unknown): number {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const parsed = parseFloat(String(value ?? ''));
  return isFinite(parsed) ? parsed : 0;
}

/**
 * Farmer asking price → buyer market price.
 * Adds the Admin's per-kg commission and rounds to centavos so every
 * surface (card, detail modal, request builder, cart, checkout) shows
 * exactly the same amount.
 */
export function withAdminCommission(farmerPrice: number): number {
  const base = parseUnitPrice(farmerPrice);
  return Math.round(base * (1 + ADMIN_COMMISSION_RATE) * 100) / 100;
}

/** Per-kg price a buyer sees in the Market for a listed crop. */
export function buyerUnitPrice(produce: { pricePerUnit: unknown } | null | undefined): number {
  if (!produce) return 0;
  return withAdminCommission(parseUnitPrice(produce.pricePerUnit));
}

/** The farmer's own asking price (no commission) — used for payouts. */
export function farmerUnitPrice(produce: { pricePerUnit: unknown } | null | undefined): number {
  if (!produce) return 0;
  return parseUnitPrice(produce.pricePerUnit);
}
