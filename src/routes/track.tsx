import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order — GhostPrinters" },
      { name: "description", content: "Enter your order number to see printing and delivery status." },
      { property: "og:title", content: "Track your order — GhostPrinters" },
      { property: "og:description", content: "Live printing and delivery status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Track,
});

function Track() {
  const { user } = useAuth();
  const [num, setNum] = useState("");
  const navigate = useNavigate();
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/auth", search: { redirect: "/track" } }); return; }
    const { data } = await supabase.from("orders").select("id").eq("order_number", num.trim().toUpperCase()).maybeSingle();
    if (!data) { toast.error("No order with that number on your account"); return; }
    navigate({ to: "/orders/$id", params: { id: data.id } });
  };
  return (
    <section className="mx-auto max-w-lg px-4 py-20">
      <h1 className="text-5xl font-extrabold">Track order</h1>
      <p className="mt-2 text-muted-foreground">Enter the order number from your confirmation (e.g. GP261012-AB12C).</p>
      <form onSubmit={go} className="mt-8 flex gap-2">
        <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="Order number" required />
        <Button variant="print" type="submit">Track</Button>
      </form>
      {user ? (
        <p className="mt-6 text-sm">Or see <Link to="/account" className="text-primary">all your orders</Link>.</p>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">You'll be asked to sign in to view order details.</p>
      )}
    </section>
  );
}
