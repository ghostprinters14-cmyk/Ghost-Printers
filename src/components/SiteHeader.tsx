import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png.asset.json";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
      <img src={logo.url} alt="GhostPrinters logo" width={44} height={44} className="h-11 w-11 object-contain" />
      Ghost<span className="text-primary">Printers</span>
    </Link>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const links = (
    <>
      <Link to="/services" className="hover:text-primary" onClick={() => setOpen(false)}>Services</Link>
      <Link to="/offers" className="hover:text-primary" onClick={() => setOpen(false)}>Offers</Link>
      <Link to="/track" className="hover:text-primary" onClick={() => setOpen(false)}>Track order</Link>
      {user && <Link to="/account" className="hover:text-primary" onClick={() => setOpen(false)}>My orders</Link>}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="h-1 cmyk-bar" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">{links}</nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          ) : (
            <Button asChild variant="outline" size="sm"><Link to="/auth">Sign in</Link></Button>
          )}
          <Button asChild variant="print" size="sm"><Link to="/services">Order now</Link></Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t px-4 py-4 text-base font-medium md:hidden">
          {links}
          {user ? (
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          ) : (
            <Button asChild variant="outline"><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
          )}
        </div>
      )}
    </header>
  );
}
