import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productsQuery } from "@/lib/products.functions";
import { calcSubtotal, inr, qtyFactor, whatsappLink } from "@/lib/site";
import { ICONS } from "@/components/ProductCard";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ context, params }) => {
    const list = await context.queryClient.ensureQueryData(productsQuery);
    const p = list.find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { name: p.name, tagline: p.tagline };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} Printing Online — GhostPrinters` },
          { name: "description", content: `${loaderData.tagline} Customise size, paper and quantity with instant pricing.` },
          { property: "og:title", content: `${loaderData.name} — GhostPrinters` },
          { property: "og:description", content: loaderData.tagline ?? "" },
          { property: "og:type", content: "product" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Product unavailable — GhostPrinters" }, { name: "robots", content: "noindex" }],
  }),
  component: ProductPage,
});

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${active ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card hover:border-ink"}`}
    >
      {active && <Check className="h-4 w-4" />}
      {children}
    </button>
  );
}

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productsQuery);
  const p = data.find((x) => x.slug === slug)!;
  const navigate = useNavigate();
  const [size, setSize] = useState(p.sizes[0]);
  const [paper, setPaper] = useState(p.papers[0]);
  const [qty, setQty] = useState<number>(p.quantities[0] ?? 1);
  const Icon = ICONS[p.slug];
  const total = calcSubtotal(Number(p.base_price), size.m, paper.m, qty);
  const saving = Math.round((1 - qtyFactor(qty)) * 100);

  const proceed = () => {
    sessionStorage.setItem("gp-cart", JSON.stringify({ productId: p.id, slug: p.slug, name: p.name, size: size.label, paper: paper.label, quantity: qty }));
    navigate({ to: "/checkout" });
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <Link to="/services" className="text-sm text-muted-foreground">← All services</Link>
        <div className="mt-4 flex items-center gap-4">
          {Icon && <span className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10"><Icon className="h-7 w-7" /></span>}
          <div>
            <h1 className="text-4xl font-extrabold md:text-5xl">{p.name}</h1>
            <p className="text-muted-foreground">{p.tagline}</p>
          </div>
        </div>
        <p className="mt-6 max-w-2xl">{p.description}</p>

        <div className="mt-10 space-y-8">
          <div>
            <h2 className="mb-3 text-lg font-bold">1. Size</h2>
            <div className="flex flex-wrap gap-2">{p.sizes.map((s) => <Chip key={s.label} active={s.label === size.label} onClick={() => setSize(s)}>{s.label}</Chip>)}</div>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold">2. Paper / material</h2>
            <div className="flex flex-wrap gap-2">{p.papers.map((s) => <Chip key={s.label} active={s.label === paper.label} onClick={() => setPaper(s)}>{s.label}</Chip>)}</div>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold">3. Quantity</h2>
            <div className="flex flex-wrap items-center gap-2">
              {p.quantities.map((q) => <Chip key={q} active={q === qty} onClick={() => setQty(q)}>{q}</Chip>)}
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-28" aria-label="Custom quantity" />
            </div>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border-2 border-ink bg-card p-6 shadow-print lg:sticky lg:top-24">
        <p className="text-sm text-muted-foreground">Your price</p>
        <p className="font-display text-5xl font-extrabold">{inr(total)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{inr(total / qty)} per unit · incl. taxes</p>
        {saving > 0 && <p className="mt-3 inline-block rounded-md bg-yellow px-2 py-1 text-xs font-bold">You save {saving}% on quantity</p>}
        <ul className="mt-5 space-y-1 text-sm">
          <li><b>Size:</b> {size.label}</li>
          <li><b>Paper:</b> {paper.label}</li>
          <li><b>Qty:</b> {qty}</li>
          <li className="flex items-center gap-1 text-muted-foreground"><Clock className="h-4 w-4" /> Turnaround {p.turnaround}</li>
        </ul>
        <Button variant="print" size="lg" className="mt-6 w-full" onClick={proceed}>Continue — upload design</Button>
        <Button asChild variant="whatsapp" className="mt-3 w-full">
          <a href={whatsappLink(`Hi, I have a question about ${p.name} (${size.label}, ${paper.label}, qty ${qty}).`)} target="_blank" rel="noreferrer">Need help? WhatsApp us</a>
        </Button>
      </aside>
    </section>
  );
}
