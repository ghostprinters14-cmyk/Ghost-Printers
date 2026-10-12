import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BadgePercent, Clock, ShieldCheck, Truck, Upload, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { productsQuery } from "@/lib/products.functions";
import { whatsappLink } from "@/lib/site";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GhostPrinters — Online Printing: Business Cards, Flyers, Banners" },
      { name: "description", content: "Upload your design, choose size, paper and quantity, pay securely and track delivery. Business cards, flyers, banners, books, stickers and more." },
      { property: "og:title", content: "GhostPrinters — Online Printing Made Simple" },
      { property: "og:description", content: "Instant prices, secure payment and doorstep delivery for all your printing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Index,
});

const TESTIMONIALS = [
  { name: "Ananya R.", role: "Café owner", text: "Menus and flyers arrived in two days and the colours were spot on. Ordering took five minutes." },
  { name: "Rahul M.", role: "Startup founder", text: "Our business cards feel premium. Live pricing made it easy to compare paper options." },
  { name: "Priya & Karan", role: "Wedding", text: "Gorgeous invitations on pearl paper. The WhatsApp team helped us fix our design file too." },
];

function Index() {
  const { data: products } = useSuspenseQuery(productsQuery);
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-2 md:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-yellow px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <BadgePercent className="h-4 w-4" /> 10% off your first order · WELCOME10
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] md:text-7xl">
            Print that <span className="text-cmyk">shows up.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Upload your design, pick your paper, see the price instantly. We print, pack and deliver — you track every step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="print" size="lg"><Link to="/services">Start an order</Link></Button>
            <Button asChild variant="outline" size="lg"><a href={whatsappLink()} target="_blank" rel="noreferrer">Ask on WhatsApp</a></Button>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex text-primary">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
            Trusted by 2,000+ businesses
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 -z-10 rotate-2 rounded-3xl cmyk-bar opacity-80" />
          <img src={hero} alt="Freshly printed business cards, flyers and brochures" width={1600} height={1104} className="aspect-[4/3] w-full rounded-2xl border-2 border-ink object-cover" />
        </div>
      </section>

      <section className="border-y-2 border-ink bg-ink text-ink-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          {[
            { i: Upload, t: "Upload PDF or design" },
            { i: ShieldCheck, t: "Secure online payment" },
            { i: Clock, t: "Fast 1–3 day turnaround" },
            { i: Truck, t: "Pickup or doorstep delivery" },
          ].map(({ i: I, t }) => (
            <div key={t} className="flex items-center gap-3 text-sm font-medium"><I className="h-5 w-5 text-yellow" />{t}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl font-extrabold md:text-5xl">What are we printing?</h2>
          <Link to="/services" className="font-semibold text-primary">See all services →</Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 rounded-3xl border-2 border-ink bg-primary p-8 text-primary-foreground md:grid-cols-[1.5fr_1fr] md:p-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest opacity-80">Bulk offer</p>
            <h2 className="mt-2 text-4xl font-extrabold md:text-5xl">20% off orders above ₹5,000</h2>
            <p className="mt-3 opacity-90">Use code <b>BULK20</b> at checkout. Plus automatic quantity discounts up to 30%.</p>
          </div>
          <div className="flex items-center md:justify-end">
            <Button asChild variant="ink" size="lg"><Link to="/offers">View all offers</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-4xl font-extrabold">How it works</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {["Choose a product", "Customise size, paper & quantity", "Upload your file & pay", "Track until it arrives"].map((s, i) => (
            <li key={s} className="rounded-2xl border bg-card p-6">
              <span className="font-display text-5xl font-extrabold text-primary">0{i + 1}</span>
              <p className="mt-3 font-semibold">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <h2 className="text-4xl font-extrabold">Loved by our customers</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-2xl border-2 border-ink bg-card p-6 shadow-print">
              <div className="flex text-primary">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <blockquote className="mt-4 text-base">“{t.text}”</blockquote>
              <figcaption className="mt-5 text-sm"><b>{t.name}</b> <span className="text-muted-foreground">· {t.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
