import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createOrder, quoteOrder, verifyPayment } from "@/lib/orders.functions";
import { openRazorpay } from "@/lib/razorpay";
import { DELIVERY, inr, type DeliveryId } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — GhostPrinters" },
      { name: "description", content: "Upload your design, choose delivery and pay securely." },
      { property: "og:title", content: "Checkout — GhostPrinters" },
      { property: "og:description", content: "Complete your print order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

type Cart = { productId: string; slug: string; name: string; size: string; paper: string; quantity: number };
type Quote = { subtotal: number; discount: number; deliveryFee: number; total: number; coupon: string | null; couponMsg: string | null };

function Checkout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const quoteFn = useServerFn(quoteOrder);
  const createFn = useServerFn(createOrder);
  const verifyFn = useServerFn(verifyPayment);
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryId>("standard");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pay, setPay] = useState<"online" | "cod">("online");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", address: "", city: "", pincode: "", notes: "" });

  useEffect(() => {
    const raw = sessionStorage.getItem("gp-cart");
    if (raw) setCart(JSON.parse(raw));
    setReady(true);
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setF((x) => ({ ...x, name: data.full_name ?? "", phone: data.phone ?? "", address: data.address ?? "", city: data.city ?? "", pincode: data.pincode ?? "" }));
    });
  }, [user.id]);

  useEffect(() => {
    if (!cart) return;
    quoteFn({ data: { productId: cart.productId, size: cart.size, paper: cart.paper, quantity: cart.quantity, delivery, couponCode: appliedCoupon || undefined } })
      .then((q) => {
        setQuote(q);
        if (appliedCoupon && q.couponMsg) (q.coupon ? toast.success : toast.error)(q.couponMsg);
      })
      .catch(() => toast.error("Could not calculate price"));
  }, [cart, delivery, appliedCoupon, quoteFn]);

  if (!ready) return null;
  if (!cart)
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold">Nothing to checkout yet</h1>
        <Button asChild variant="print" className="mt-6"><Link to="/services">Choose a product</Link></Button>
      </section>
    );

  const place = async () => {
    if (!f.name || !f.phone) return toast.error("Add your name and phone number");
    if (delivery !== "pickup" && (!f.address || !f.city || !f.pincode)) return toast.error("Add your delivery address");
    if (!file) return toast.error("Upload your design file (PDF, PNG, JPG, AI)");
    if (file.size > 50 * 1024 * 1024) return toast.error("File must be under 50 MB");
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("order-files").upload(path, file);
      if (up.error) throw new Error("File upload failed");
      await supabase.from("profiles").update({ full_name: f.name, phone: f.phone, address: f.address, city: f.city, pincode: f.pincode }).eq("id", user.id);
      const res = await createFn({
        data: {
          productId: cart.productId, size: cart.size, paper: cart.paper, quantity: cart.quantity,
          couponCode: quote?.coupon ?? undefined, delivery, paymentMethod: pay,
          filePath: path, fileName: file.name, notes: f.notes || undefined,
          customerName: f.name, phone: f.phone, address: f.address || undefined, city: f.city || undefined, pincode: f.pincode || undefined,
        },
      });
      sessionStorage.removeItem("gp-cart");
      if (res.razorpay) {
        try {
          const r = await openRazorpay({ ...res.razorpay, name: f.name, phone: f.phone, email: user.email, description: `${cart.name} × ${cart.quantity}` });
          await verifyFn({ data: { orderId: res.orderId, razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, signature: r.razorpay_signature } });
          toast.success("Payment successful!");
        } catch (e: any) {
          toast.error(`${e.message}. You can pay later from your order page.`);
        }
      } else if (res.paymentError) toast.message(res.paymentError);
      else toast.success("Order placed!");
      navigate({ to: "/orders/$id", params: { id: res.orderId } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not place order");
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div className="space-y-10">
        <h1 className="text-4xl font-extrabold">Checkout</h1>

        <div>
          <h2 className="mb-3 text-lg font-bold">1. Upload your design</h2>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink bg-card p-8 text-center hover:bg-muted">
            <FileUp className="h-8 w-8 text-primary" />
            <span className="font-semibold">{file ? file.name : "Click to upload PDF, PNG, JPG, AI, PSD or ZIP"}</span>
            <span className="text-xs text-muted-foreground">Max 50 MB · No design? Upload a brief and we'll WhatsApp you</span>
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.eps,.svg,.zip,.cdr,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">2. Delivery</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {DELIVERY.map((d) => (
              <button key={d.id} type="button" onClick={() => setDelivery(d.id)} className={`rounded-xl border-2 p-4 text-left ${delivery === d.id ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-ink"}`}>
                <p className="font-semibold">{d.label}</p>
                <p className="text-sm opacity-75">{d.fee ? inr(d.fee) : "Free"} · {d.desc}</p>
                <p className="mt-1 text-xs opacity-60">{d.eta}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">3. Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Full name</Label><Input value={f.name} onChange={set("name")} maxLength={120} /></div>
            <div><Label>Phone (WhatsApp)</Label><Input value={f.phone} onChange={set("phone")} maxLength={20} /></div>
            {delivery !== "pickup" && (
              <>
                <div className="sm:col-span-2"><Label>Address</Label><Input value={f.address} onChange={set("address")} maxLength={500} /></div>
                <div><Label>City</Label><Input value={f.city} onChange={set("city")} maxLength={100} /></div>
                <div><Label>PIN code</Label><Input value={f.pincode} onChange={set("pincode")} maxLength={12} /></div>
              </>
            )}
            <div className="sm:col-span-2"><Label>Notes for our team (optional)</Label><Textarea value={f.notes} onChange={set("notes")} maxLength={2000} /></div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">4. Payment</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "online" as const, t: "Pay online", d: "UPI, cards, netbanking via Razorpay" },
              { id: "cod" as const, t: delivery === "pickup" ? "Pay at pickup" : "Cash on delivery", d: "Pay when you receive" },
            ].map((o) => (
              <button key={o.id} type="button" onClick={() => setPay(o.id)} className={`rounded-xl border-2 p-4 text-left ${pay === o.id ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-ink"}`}>
                <p className="font-semibold">{o.t}</p>
                <p className="text-sm opacity-75">{o.d}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border-2 border-ink bg-card p-6 shadow-print lg:sticky lg:top-24">
        <h2 className="text-xl font-bold">{cart.name}</h2>
        <p className="text-sm text-muted-foreground">{cart.size} · {cart.paper} · Qty {cart.quantity}</p>
        <Link to="/products/$slug" params={{ slug: cart.slug }} className="text-sm text-primary">Edit options</Link>
        <div className="mt-5 flex gap-2">
          <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
          <Button variant="outline" onClick={() => setAppliedCoupon(coupon)}>Apply</Button>
        </div>
        {quote ? (
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(quote.subtotal)}</dd></div>
            {quote.discount > 0 && <div className="flex justify-between text-success"><dt>Discount ({quote.coupon})</dt><dd>−{inr(quote.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.deliveryFee ? inr(quote.deliveryFee) : "Free"}</dd></div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold"><dt>Total</dt><dd>{inr(quote.total)}</dd></div>
          </dl>
        ) : (
          <Loader2 className="mt-6 animate-spin" />
        )}
        <Button variant="print" size="lg" className="mt-6 w-full" disabled={busy || !quote} onClick={place}>
          {busy ? "Placing order…" : pay === "online" ? "Pay & place order" : "Place order"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout · Prices include taxes</p>
      </aside>
    </section>
  );
}
