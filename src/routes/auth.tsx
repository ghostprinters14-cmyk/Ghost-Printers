import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//") ? s.redirect : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — GhostPrinters" },
      { name: "description", content: "Sign in or create a GhostPrinters account to order prints and track deliveries." },
      { property: "og:title", content: "Sign in — GhostPrinters" },
      { property: "og:description", content: "Access your orders and checkout faster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(6).max(72) });

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const dest = redirect ?? "/account";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: dest, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: dest, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [dest, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Check your email for a reset link");
        return;
      }
      const v = schema.safeParse({ email, password });
      if (!v.success) throw new Error("Enter a valid email and a password of at least 6 characters");
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (redirect) sessionStorage.setItem("gp-after-login", redirect);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" + (redirect ? `?redirect=${encodeURIComponent(redirect)}` : "") });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border-2 border-ink bg-card p-8 shadow-print">
        <h1 className="text-3xl font-extrabold">{mode === "up" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track orders, reorder and checkout faster.</p>
        {mode !== "forgot" && (
          <>
            <Button variant="outline" className="mt-6 w-full" onClick={google}>Continue with Google</Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          </>
        )}
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></div>
          )}
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {mode !== "forgot" && (
            <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          )}
          <Button type="submit" variant="print" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </Button>
        </form>
        <div className="mt-5 flex justify-between text-sm">
          {mode === "in" ? (
            <>
              <button className="text-primary" onClick={() => setMode("up")}>Create account</button>
              <button className="text-muted-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>
            </>
          ) : (
            <button className="text-primary" onClick={() => setMode("in")}>Back to sign in</button>
          )}
        </div>
      </div>
    </section>
  );
}
