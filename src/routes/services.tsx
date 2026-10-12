import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { productsQuery } from "@/lib/products.functions";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Printing Services — GhostPrinters" },
      { name: "description", content: "Business cards, flyers, banners, brochures, books, stickers, invitations and custom printing with instant online pricing." },
      { property: "og:title", content: "Printing Services — GhostPrinters" },
      { property: "og:description", content: "Pick a product, customise it and order online in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Services,
});

function Services() {
  const { data } = useSuspenseQuery(productsQuery);
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-5xl font-extrabold">Printing services</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Every product comes with live pricing, premium paper choices and quantity discounts.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
      </div>
    </section>
  );
}
