export const SITE = {
  name: "GhostPrinters",
  whatsapp: "919390820423",
  phoneDisplay: "+91 93908 20423",
  email: "info.ghostprinters@gmail.com",
  city: "India",
};

export const whatsappLink = (text = "Hi GhostPrinters, I need help with a print order.") =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

export type Option = { label: string; m: number };

export const DELIVERY = [
  { id: "pickup", label: "Store pickup", desc: "Collect from our studio", fee: 0, eta: "Ready in turnaround time" },
  { id: "standard", label: "Standard delivery", desc: "Free above ₹2,000", fee: 99, eta: "3–5 days after printing" },
  { id: "express", label: "Express delivery", desc: "Priority courier", fee: 249, eta: "1–2 days after printing" },
] as const;
export type DeliveryId = (typeof DELIVERY)[number]["id"];

export const ORDER_STATUSES = ["placed", "confirmed", "printing", "ready", "shipped", "delivered", "cancelled"] as const;

export function qtyFactor(q: number) {
  if (q >= 1000) return 0.7;
  if (q >= 500) return 0.8;
  if (q >= 250) return 0.88;
  if (q >= 100) return 0.95;
  return 1;
}

export function calcSubtotal(base: number, sizeM: number, paperM: number, qty: number) {
  return Math.round(base * sizeM * paperM * qty * qtyFactor(qty));
}

export function deliveryFee(id: DeliveryId, afterDiscount: number) {
  const d = DELIVERY.find((x) => x.id === id) ?? DELIVERY[0];
  if (id === "standard" && afterDiscount >= 2000) return 0;
  return d.fee;
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
