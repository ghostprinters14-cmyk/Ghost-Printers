import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcSubtotal, deliveryFee, type DeliveryId, type Option } from "./site";

const orderInput = z.object({
  productId: z.string().uuid(),
  size: z.string().min(1).max(100),
  paper: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(100000),
  couponCode: z.string().max(40).optional(),
  delivery: z.enum(["pickup", "standard", "express"]),
  paymentMethod: z.enum(["online", "cod"]),
  filePath: z.string().max(500).optional(),
  fileName: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
  customerName: z.string().min(1).max(120),
  phone: z.string().min(6).max(20),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  pincode: z.string().max(12).optional(),
});

async function priceOrder(supabase: any, d: { productId: string; size: string; paper: string; quantity: number; couponCode?: string; delivery: DeliveryId }) {
  const { data: p, error } = await supabase.from("products").select("*").eq("id", d.productId).eq("active", true).single();
  if (error || !p) throw new Error("Product not available");
  const size = (p.sizes as Option[]).find((s) => s.label === d.size);
  const paper = (p.papers as Option[]).find((s) => s.label === d.paper);
  if (!size || !paper) throw new Error("Invalid options");
  const subtotal = calcSubtotal(Number(p.base_price), size.m, paper.m, d.quantity);
  let discount = 0;
  let coupon: string | null = null;
  let couponMsg: string | null = null;
  if (d.couponCode?.trim()) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("coupons").select("*").eq("code", d.couponCode.trim().toUpperCase()).eq("active", true).maybeSingle();
    if (!c) couponMsg = "Coupon not valid";
    else if (subtotal < Number(c.min_order)) couponMsg = `Minimum order ₹${c.min_order} for this coupon`;
    else {
      discount = Math.round((subtotal * c.percent) / 100);
      coupon = c.code;
      couponMsg = `${c.percent}% off applied`;
    }
  }
  const fee = deliveryFee(d.delivery, subtotal - discount);
  return { product: p, subtotal, discount, deliveryFee: fee, total: subtotal - discount + fee, coupon, couponMsg };
}

export const quoteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orderInput.pick({ productId: true, size: true, paper: true, quantity: true, couponCode: true, delivery: true }).parse(d))
  .handler(async ({ data, context }) => {
    const q = await priceOrder(context.supabase, data);
    return { subtotal: q.subtotal, discount: q.discount, deliveryFee: q.deliveryFee, total: q.total, coupon: q.coupon, couponMsg: q.couponMsg };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orderInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.delivery !== "pickup" && (!data.address || !data.city || !data.pincode)) throw new Error("Delivery address is required");
    if (data.filePath && !data.filePath.startsWith(`${context.userId}/`)) throw new Error("Invalid file");
    const q = await priceOrder(context.supabase, data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        product_id: q.product.id,
        product_name: q.product.name,
        size: data.size,
        paper: data.paper,
        quantity: data.quantity,
        file_path: data.filePath ?? null,
        file_name: data.fileName ?? null,
        notes: data.notes ?? null,
        subtotal: q.subtotal,
        discount: q.discount,
        delivery_fee: q.deliveryFee,
        total: q.total,
        coupon_code: q.coupon,
        delivery_method: data.delivery,
        payment_method: data.paymentMethod,
        customer_name: data.customerName,
        phone: data.phone,
        address: data.address ?? null,
        city: data.city ?? null,
        pincode: data.pincode ?? null,
      })
      .select("id, order_number, total")
      .single();
    if (error || !order) throw new Error("Could not place order");

    if (data.paymentMethod === "cod") return { orderId: order.id, orderNumber: order.order_number, razorpay: null, paymentError: null };

    const keyId = process.env["RAZORPAY_KEY_ID"];
    const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !secret) {
      return { orderId: order.id, orderNumber: order.order_number, razorpay: null, paymentError: "Online payments are not active yet. Your order is saved — we'll contact you on WhatsApp to collect payment." };
    }
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${secret}`) },
      body: JSON.stringify({ amount: Math.round(Number(order.total) * 100), currency: "INR", receipt: order.order_number }),
    });
    if (!res.ok) {
      console.error("Razorpay order failed", res.status, await res.text());
      return { orderId: order.id, orderNumber: order.order_number, razorpay: null, paymentError: "Payment gateway is unavailable right now. Your order is saved; you can pay from your order page." };
    }
    const rz = (await res.json()) as { id: string; amount: number };
    await supabaseAdmin.from("orders").update({ razorpay_order_id: rz.id }).eq("id", order.id);
    return { orderId: order.id, orderNumber: order.order_number, razorpay: { keyId, orderId: rz.id, amount: rz.amount }, paymentError: null };
  });

export const retryPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: o } = await context.supabase.from("orders").select("*").eq("id", data.orderId).eq("user_id", context.userId).single();
    if (!o || o.payment_status === "paid") throw new Error("Order not payable");
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !secret) throw new Error("Online payments are not active yet");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${secret}`) },
      body: JSON.stringify({ amount: Math.round(Number(o.total) * 100), currency: "INR", receipt: o.order_number }),
    });
    if (!res.ok) throw new Error("Payment gateway unavailable");
    const rz = (await res.json()) as { id: string; amount: number };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").update({ razorpay_order_id: rz.id, payment_method: "online" }).eq("id", o.id);
    return { keyId, orderId: rz.id, amount: rz.amount };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ orderId: z.string().uuid(), razorpayOrderId: z.string().max(100), razorpayPaymentId: z.string().max(100), signature: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!secret) throw new Error("Payments not configured");
    const { data: o } = await context.supabase.from("orders").select("id, razorpay_order_id").eq("id", data.orderId).eq("user_id", context.userId).single();
    if (!o || o.razorpay_order_id !== data.razorpayOrderId) throw new Error("Order mismatch");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${data.razorpayOrderId}|${data.razorpayPaymentId}`));
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex !== data.signature) throw new Error("Payment verification failed");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").update({ payment_status: "paid", razorpay_payment_id: data.razorpayPaymentId, status: "confirmed", updated_at: new Date().toISOString() }).eq("id", o.id);
    return { ok: true };
  });
