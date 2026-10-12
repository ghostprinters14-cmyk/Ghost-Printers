import { Check } from "lucide-react";
import { ORDER_STATUSES } from "@/lib/site";

const LABELS: Record<string, string> = {
  placed: "Order placed", confirmed: "Confirmed", printing: "Printing", ready: "Ready", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "delivered" ? "bg-success/15 text-success" : status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{LABELS[status] ?? status}</span>;
}

export function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") return <StatusBadge status={status} />;
  const steps = ORDER_STATUSES.filter((s) => s !== "cancelled");
  const idx = steps.indexOf(status as (typeof steps)[number]);
  return (
    <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-col items-center text-center text-xs">
          <span className={`grid h-8 w-8 place-items-center rounded-full border-2 ${i <= idx ? "border-ink bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
            {i <= idx ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={`mt-2 ${i <= idx ? "font-semibold" : "text-muted-foreground"}`}>{LABELS[s]}</span>
        </li>
      ))}
    </ol>
  );
}
