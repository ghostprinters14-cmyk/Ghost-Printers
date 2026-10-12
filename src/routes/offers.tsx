import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Discounts — GhostPrinters" },
      { name: "description", content: "Coupon codes, first-order discounts, bulk savings and free delivery on GhostPrinters orders." },
      { property: "og:title", content: "Offers & Discounts — GhostPrinters" },
      { property: "og:description", content: "Save on every print order with our current offers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Offers,
});

const OFFERS = [
  { code: "WELCOME10", title: "10% off your first order", body: "New here? Take 10% off any product.", tone: "bg-yellow" },
  { code: "BULK20", title: "20% off above ₹5,000", body: "Big run? Save 20% on orders above ₹5,000.", tone: "bg-primary text-primary-foreground" },
  { code: null, title: "Up to 30% quantity discount", body: "Automatic: 5% at 100, 12% at 250, 20% at 500, 30% at 1,000+ units.", tone: "bg-cyan" },
  { code: null, title: "Free standard delivery", body: "On orders above ₹2,000 after discounts.", tone: "bg-card" },
];

function Offers() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-5xl font-extrabold">Offers</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {OFFERS.map((o) => (
          <div key={o.title} className={`rounded-2xl border-2 border-ink p-7 shadow-print ${o.tone}`}>
            <h2 className="text-2xl font-extrabold">{o.title}</h2>
            <p className="mt-2 opacity-80">{o.body}</p>
            {o.code && <p className="mt-5 inline-block rounded-md border-2 border-dashed border-current px-3 py-1 font-mono font-bold">{o.code}</p>}
          </div>
        ))}
      </div>
      <Button asChild variant="print" size="lg" className="mt-10"><Link to="/services">Shop now</Link></Button>
    </section>
  );
}
