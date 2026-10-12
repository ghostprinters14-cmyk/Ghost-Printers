import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusTimeline";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My orders — GhostPrinters" },
      { name: "description", content: "Your GhostPrinters order history and delivery status." },
      { property: "og:title", content: "My orders — GhostPrinters" },
      { property: "og:description", content: "Order history and tracking." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", user.id],
    queryFn: async () => (await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">My orders</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button asChild variant="print"><Link to="/services">New order</Link></Button>
      </div>
      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No orders yet.</p>}
        {data?.map((o) => (
          <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 bg-card p-4 hover:border-ink">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{o.order_number}</p>
              <p className="font-semibold">{o.product_name} × {o.quantity}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={o.status} />
              <span className={`text-xs ${o.payment_status === "paid" ? "text-success" : "text-muted-foreground"}`}>{o.payment_status}</span>
              <span className="font-bold">{inr(Number(o.total))}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
