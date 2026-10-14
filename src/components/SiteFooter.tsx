import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { SITE, whatsappLink } from "@/lib/site";
import logo from "@/assets/logo.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="h-1 cmyk-bar" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src={logo.url} alt="GhostPrinters logo" width={96} height={96} loading="lazy" className="mb-3 h-24 w-24 rounded-xl bg-card object-contain p-1" />
          <p className="font-display text-2xl font-extrabold">Ghost<span className="text-primary">Printers</span></p>
          <p className="mt-3 max-w-sm text-sm opacity-70">Online printing for businesses, creators and celebrations. Upload, pay, and track — we handle the ink.</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Shop</p>
          <ul className="space-y-2 opacity-80">
            <li><Link to="/services">All services</Link></li>
            <li><Link to="/offers">Offers</Link></li>
            <li><Link to="/track">Track order</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Support</p>
          <ul className="space-y-2 opacity-80">
            <li><a href={whatsappLink()} target="_blank" rel="noreferrer">WhatsApp {SITE.phoneDisplay}</a></li>
            <li><a href={`tel:+${SITE.whatsapp}`}>Call {SITE.phoneDisplay}</a></li>
            <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-ink-foreground/10 py-5 text-center text-xs opacity-60">© {new Date().getFullYear()} GhostPrinters. All rights reserved.</p>
    </footer>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-whatsapp text-ink shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
