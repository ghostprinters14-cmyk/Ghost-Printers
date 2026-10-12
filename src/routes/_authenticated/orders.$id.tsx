import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/StatusTimeline";
import { supabase } from "@/integrations/supabase/client";
import { retryPayment, verifyPayment } from "@/lib/orders.functions";
import { openRazorpay } from "@/lib/razorpay";
import { DELIVERY, inr, whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — GhostPrinters" },
      { name: "description", content: "Track your GhostPrinters order." },
      { property: "og:title", content: "Order details — GhostPrinters" },
      { property: "og:description", content: "Order status and delivery tracking." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const retry = useServerFn(retryPayment);
  const verify = useServerFn(verifyPayment);
  const { data: o, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await supabase.from("orders").select("*").eq("id", id).maybeSingle()).data,
  });

  if (isLoading) return <p className="p-12 text-center text-muted-foreground">Loading…</p>;
  if (!o) return <p className="p-12 text-center">Order not found. <Link to="/account" className="text-primary">Back to orders</Link></p>;

  const payNow = async () => {
    try {
      const r = await retry({ data: { orderId: o.id } });
      const p = await openRazorpay({ ...r, name: o.customer_name ?? undefined, phone: o.phone ?? undefined, email: user.email, description: `${o.product_name} × ${o.quantity}` });
      await verify({ data: { orderId: o.id, razorpayOrderId: p.razorpay_order_id, razorpayPaymentId: p.razorpay_payment_id, signature: p.razorpay_signature } });
      toast.success("Payment successful!");
      qc.invalidateQueries({ queryKey: ["order", id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const delivery = DELIVERY.find((d) => d.id === o.delivery_method);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <Link to="/account" className="text-sm text-muted-foreground">← My orders</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{o.order_number}</p>
          <h1 className="text-4xl font-extrabold">{o.product_name}</h1>
        </div>
        <p className="font-display text-3xl font-extrabold">{inr(Number(o.total))}</p>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-ink bg-card p-6"><StatusTimeline status={o.status} /></div>

      {o.payment_status !== "paid" && o.status !== "cancelled" && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-yellow/40 p-5">
          <p className="text-sm font-medium">Payment pending{o.payment_method === "cod" ? " — pay on delivery/pickup, or pay online now." : "."}</p>
          <Button variant="print" onClick={payNow}>Pay {inr(Number(o.total))} online</Button>
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 text-sm">
          <h2 className="mb-3 text-lg font-bold">Order</h2>
          <p>Size: {o.size}</p><p>Paper: {o.paper}</p><p>Quantity: {o.quantity}</p><p>File: {o.file_name ?? "—"}</p>
          {o.notes && <p className="mt-2 text-muted-foreground">“{o.notes}”</p>}
          <dl className="mt-4 space-y-1 border-t pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(Number(o.subtotal))}</dd></div>
            {Number(o.discount) > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{inr(Number(o.discount))}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{inr(Number(o.delivery_fee))}</dd></div>
            <div className="flex justify-between"><dt>Payment</dt><dd className="capitalize">{o.payment_status}</dd></div>
          </dl>
        </div>
        <div className="rounded-2xl border bg-card p-6 text-sm">
          <h2 className="mb-3 text-lg font-bold">Delivery</h2>
          <p className="font-semibold">{delivery?.label}</p>
          <p>{o.customer_name} · {o.phone}</p>
          {o.address && <p className="text-muted-foreground">{o.address}, {o.city} {o.pincode}</p>}
          {o.tracking_number ? (
            <p className="mt-4 rounded-lg bg-accent p-3"><b>{o.courier ?? "Courier"}</b> tracking: <span className="font-mono">{o.tracking_number}</span></p>
          ) : (
            <p className="mt-4 text-muted-foreground">Tracking number appears here once shipped.</p>
          )}
          <Button asChild variant="whatsapp" className="mt-5 w-full">
            <a href={whatsappLink(`Hi, I'm checking on order ${o.order_number}.`)} target="_blank" rel="noreferrer">Ask about this order</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
