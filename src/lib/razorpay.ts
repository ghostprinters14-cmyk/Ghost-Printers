declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export async function openRazorpay(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  name?: string;
  phone?: string;
  email?: string;
  description: string;
}): Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }> {
  const ok = await loadScript();
  if (!ok) throw new Error("Could not load payment window");
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: opts.keyId,
      amount: opts.amount,
      currency: "INR",
      order_id: opts.orderId,
      name: "GhostPrinters",
      description: opts.description,
      prefill: { name: opts.name, contact: opts.phone, email: opts.email },
      theme: { color: "#e0267a" },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rz.open();
  });
}
