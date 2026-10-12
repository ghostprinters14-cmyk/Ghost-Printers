import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — GhostPrinters" },
      { name: "description", content: "Choose a new password for your GhostPrinters account." },
      { property: "og:title", content: "Set new password — GhostPrinters" },
      { property: "og:description", content: "Reset your account password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { toast.error("Use at least 6 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/account" });
  };
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-ink bg-card p-8 shadow-print">
        <h1 className="text-3xl font-extrabold">New password</h1>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
        <Button type="submit" variant="print" className="w-full">Update password</Button>
      </form>
    </section>
  );
}
