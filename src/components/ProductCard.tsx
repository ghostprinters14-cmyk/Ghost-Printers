import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, CreditCard, FileText, Flag, Mail, Newspaper, Sparkles, Sticker } from "lucide-react";
import type { Product } from "@/lib/products.functions";
import { calcSubtotal, inr } from "@/lib/site";

export const ICONS: Record<string, typeof CreditCard> = {
  "business-cards": CreditCard,
  flyers: FileText,
  banners: Flag,
  brochures: Newspaper,
  books: BookOpen,
  stickers: Sticker,
  invitations: Mail,
  "custom-printing": Sparkles,
};

const TINTS = ["bg-primary/10", "bg-cyan/15", "bg-yellow/30", "bg-ink/5"];

export function ProductCard({ p, i }: { p: Product; i: number }) {
  const Icon = ICONS[p.slug] ?? Sparkles;
  const q = p.quantities[0] ?? 1;
  const from = calcSubtotal(Number(p.base_price), p.sizes[0]?.m ?? 1, p.papers[0]?.m ?? 1, q);
  return (
    <Link
      to="/products/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col rounded-2xl border-2 border-ink bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-print"
    >
      {p.image_url ? (
        <img src={p.image_url} alt={p.name} loading="lazy" className="aspect-[4/3] w-full rounded-xl border object-cover" />
      ) : (
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${TINTS[i % TINTS.length]}`}>
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.category}</p>
      <h3 className="mt-1 text-xl font-bold">{p.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
      <div className="mt-auto flex items-end justify-between pt-6">
        <p className="text-sm">
          <span className="text-muted-foreground">From </span>
          <span className="font-bold">{inr(from)}</span>
          <span className="text-muted-foreground"> / {q}</span>
        </p>
        <ArrowUpRight className="h-5 w-5 transition-transform group-hover:rotate-45 group-hover:text-primary" />
      </div>
      <span className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity group-hover:opacity-90">
        Order Now
      </span>
    </Link>
  );
}
