import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusTimeline";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { inr, ORDER_STATUSES } from "@/lib/site";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/account" });
  },
  head: () => ({
    meta: [
      { title: "Admin dashboard — GhostPrinters" },
      { name: "description", content: "Manage products, prices, discounts and orders." },
      { property: "og:title", content: "Admin — GhostPrinters" },
      { property: "og:description", content: "GhostPrinters admin." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const revenue = orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0);
  const open = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const unpaid = orders.filter((o) => o.payment_status !== "paid" && o.status !== "cancelled").length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-extrabold">Admin dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["Total orders", orders.length], ["Open orders", open], ["Awaiting payment", unpaid], ["Paid revenue", inr(revenue)]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border-2 border-ink bg-card p-5">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="font-display text-3xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>
      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="orders">Orders & payments</TabsTrigger>
          <TabsTrigger value="products">Products & prices</TabsTrigger>
          <TabsTrigger value="coupons">Discounts</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersTab orders={orders} /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="coupons"><CouponsTab /></TabsContent>
        <TabsContent value="customers"><CustomersTab orders={orders} /></TabsContent>
      </Tabs>
    </section>
  );
}

/* ---------- Orders ---------- */
function OrdersTab({ orders }: { orders: OrderRow[] }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const list = orders.filter((o) => (filter === "all" || o.status === filter) && (!q || `${o.order_number} ${o.customer_name} ${o.phone}`.toLowerCase().includes(q.toLowerCase())));

  const update = async (id: string, patch: Partial<OrderRow>) => {
    const { error } = await supabase.from("orders").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };
  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("order-files").createSignedUrl(path, 600);
    if (error || !data) return void toast.error("Could not open file");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search order, name, phone" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {list.length === 0 && <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No orders.</p>}
      {list.map((o) => (
        <div key={o.id} className="rounded-2xl border-2 bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{o.order_number} · {new Date(o.created_at).toLocaleString("en-IN")}</p>
              <p className="font-bold">{o.product_name} × {o.quantity} <span className="font-normal text-muted-foreground">({o.size}, {o.paper})</span></p>
              <p className="text-sm">{o.customer_name} · <a className="text-primary" href={`tel:${o.phone}`}>{o.phone}</a> · {o.delivery_method}{o.address ? ` — ${o.address}, ${o.city} ${o.pincode}` : ""}</p>
              {o.notes && <p className="text-sm text-muted-foreground">“{o.notes}”</p>}
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-extrabold">{inr(Number(o.total))}</p>
              <StatusBadge status={o.status} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label className="text-xs">Order status</Label>
              <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Payment ({o.payment_method})</Label>
              <select value={o.payment_status} onChange={(e) => update(o.id, { payment_status: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {["pending", "paid", "refunded", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <TrackingFields order={o} onSave={(p) => update(o.id, p)} />
            <div className="flex items-end">
              {o.file_path ? (
                <Button variant="outline" className="w-full" onClick={() => download(o.file_path!)}><Download /> {o.file_name?.slice(0, 18) ?? "File"}</Button>
              ) : <span className="text-sm text-muted-foreground">No file</span>}
            </div>
          </div>
          {o.razorpay_payment_id && <p className="mt-2 font-mono text-xs text-muted-foreground">Razorpay payment: {o.razorpay_payment_id}</p>}
        </div>
      ))}
    </div>
  );
}

function TrackingFields({ order, onSave }: { order: OrderRow; onSave: (p: Partial<OrderRow>) => void }) {
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tn, setTn] = useState(order.tracking_number ?? "");
  return (
    <div className="sm:col-span-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
      <div><Label className="text-xs">Courier</Label><Input value={courier} onChange={(e) => setCourier(e.target.value)} /></div>
      <div><Label className="text-xs">Tracking no.</Label><Input value={tn} onChange={(e) => setTn(e.target.value)} /></div>
      <Button variant="ink" onClick={() => onSave({ courier: courier || null, tracking_number: tn || null })}>Save</Button>
    </div>
  );
}

/* ---------- Products ---------- */
const emptyProduct = (): Partial<ProductRow> => ({
  name: "", slug: "", category: "General", tagline: "", description: "", base_price: 10, turnaround: "2-3 days", active: true, sort_order: 99, image_url: null,
  sizes: [{ label: "Standard", m: 1 }], papers: [{ label: "Standard", m: 1 }], quantities: [50, 100, 250],
});

function ProductsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<ProductRow> | null>(null);
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("sort_order")).data ?? [],
  });
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
  const toggle = async (p: ProductRow) => {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    refresh();
  };
  const remove = async (p: ProductRow) => {
    if (!confirm(`Delete ${p.name}? Past orders keep their details.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return void toast.error(error.message);
    toast.success("Product deleted");
    refresh();
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">Changes appear on the website immediately.</p>
        <Button variant="print" onClick={() => setEditing(emptyProduct())}><Plus /> Add product</Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="flex gap-4 rounded-2xl border-2 bg-card p-4">
            {p.image_url ? <img src={p.image_url} alt={p.name} className="h-20 w-20 rounded-lg object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">No image</div>}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase text-muted-foreground">{p.category}</p>
              <p className="font-bold">{p.name}</p>
              <p className="text-sm">Base {inr(Number(p.base_price))}/unit · {(p.sizes as any[]).length} sizes · {(p.papers as any[]).length} papers</p>
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm"><Switch checked={p.active} onCheckedChange={() => toggle(p)} /> {p.active ? "Live" : "Hidden"}</label>
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p)} aria-label="Delete"><Trash2 /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {editing && <ProductForm initial={editing} categories={categories} onDone={() => { setEditing(null); refresh(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Opt = { label: string; m: number };

function OptionEditor({ title, value, onChange }: { title: string; value: Opt[]; onChange: (v: Opt[]) => void }) {
  return (
    <div>
      <Label>{title} <span className="font-normal text-muted-foreground">(price multiplier, 1 = base)</span></Label>
      <div className="mt-1 space-y-2">
        {value.map((o, i) => (
          <div key={i} className="flex gap-2">
            <Input value={o.label} placeholder="Label" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <Input type="number" step="0.05" min={0.05} value={o.m} className="w-24" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, m: Number(e.target.value) } : x)))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { label: "", m: 1 }])}><Plus /> Add option</Button>
      </div>
    </div>
  );
}

function ProductForm({ initial, categories, onDone }: { initial: Partial<ProductRow>; categories: string[]; onDone: () => void }) {
  const [p, setP] = useState<Partial<ProductRow>>(initial);
  const [sizes, setSizes] = useState<Opt[]>((initial.sizes as Opt[]) ?? []);
  const [papers, setPapers] = useState<Opt[]>((initial.papers as Opt[]) ?? []);
  const [qtys, setQtys] = useState(((initial.quantities as number[]) ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ProductRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value });

  const uploadImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return void toast.error("Image must be under 10 MB");
    setBusy(true);
    const path = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return void toast.error("Upload failed"); }
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setP((x) => ({ ...x, image_url: data?.signedUrl ?? null }));
    setBusy(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantities = qtys.split(",").map((s) => parseInt(s.trim())).filter((n) => n > 0);
    const cleanSizes = sizes.filter((s) => s.label.trim() && s.m > 0);
    const cleanPapers = papers.filter((s) => s.label.trim() && s.m > 0);
    if (!p.name?.trim()) return void toast.error("Name is required");
    if (!cleanSizes.length || !cleanPapers.length || !quantities.length) return void toast.error("Add at least one size, paper and quantity");
    if (!(Number(p.base_price) > 0)) return void toast.error("Base price must be above 0");
    const slug = (p.slug?.trim() || p.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const row = {
      name: p.name.trim(), slug, category: p.category?.trim() || "General", tagline: p.tagline ?? null, description: p.description ?? null,
      base_price: Number(p.base_price), turnaround: p.turnaround ?? null, active: p.active ?? true, sort_order: Number(p.sort_order ?? 99),
      image_url: p.image_url ?? null, sizes: cleanSizes, papers: cleanPapers, quantities,
    };
    setBusy(true);
    const { error } = p.id ? await supabase.from("products").update(row).eq("id", p.id) : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) return void toast.error(error.message.includes("duplicate") ? "That web address (slug) is already used" : error.message);
    toast.success("Product saved — live on the website");
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Name</Label><Input value={p.name ?? ""} onChange={set("name")} maxLength={100} /></div>
        <div>
          <Label>Category</Label>
          <Input list="cats" value={p.category ?? ""} onChange={set("category")} maxLength={60} />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div><Label>Base price per unit (₹)</Label><Input type="number" step="0.01" min={0.01} value={p.base_price ?? ""} onChange={set("base_price")} /></div>
        <div><Label>Turnaround</Label><Input value={p.turnaround ?? ""} onChange={set("turnaround")} /></div>
        <div><Label>Web address (slug)</Label><Input value={p.slug ?? ""} onChange={set("slug")} placeholder="auto from name" /></div>
        <div><Label>Display order</Label><Input type="number" value={p.sort_order ?? 99} onChange={set("sort_order")} /></div>
      </div>
      <div><Label>Tagline</Label><Input value={p.tagline ?? ""} onChange={set("tagline")} maxLength={140} /></div>
      <div><Label>Description</Label><Textarea value={p.description ?? ""} onChange={set("description")} maxLength={2000} /></div>
      <div>
        <Label>Product image</Label>
        <div className="mt-1 flex items-center gap-3">
          {p.image_url && <img src={p.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          {p.image_url && <Button type="button" variant="ghost" size="sm" onClick={() => setP({ ...p, image_url: null })}>Remove</Button>}
        </div>
      </div>
      <OptionEditor title="Sizes" value={sizes} onChange={setSizes} />
      <OptionEditor title="Paper / material" value={papers} onChange={setPapers} />
      <div><Label>Quantity options (comma separated)</Label><Input value={qtys} onChange={(e) => setQtys(e.target.value)} placeholder="50, 100, 250" /></div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={p.active ?? true} onCheckedChange={(v) => setP({ ...p, active: v })} /> Visible on website</label>
      <Button type="submit" variant="print" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save product"}</Button>
    </form>
  );
}

/* ---------- Coupons ---------- */
function CouponsTab() {
  const qc = useQueryClient();
  const { data: coupons = [] } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => (await supabase.from("coupons").select("*").order("created_at")).data ?? [],
  });
  const [c, setC] = useState({ code: "", percent: 10, min_order: 0, description: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = c.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) return void toast.error("Enter a code");
    if (c.percent < 1 || c.percent > 90) return void toast.error("Discount must be 1–90%");
    const { error } = await supabase.from("coupons").insert({ ...c, code });
    if (error) return void toast.error(error.message.includes("duplicate") ? "Code already exists" : error.message);
    setC({ code: "", percent: 10, min_order: 0, description: "" });
    toast.success("Discount created");
    refresh();
  };
  return (
    <div className="mt-4 space-y-4">
      <form onSubmit={add} className="grid gap-3 rounded-2xl border-2 bg-card p-4 sm:grid-cols-5">
        <div><Label>Code</Label><Input value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} /></div>
        <div><Label>% off</Label><Input type="number" value={c.percent} onChange={(e) => setC({ ...c, percent: Number(e.target.value) })} /></div>
        <div><Label>Min order ₹</Label><Input type="number" value={c.min_order} onChange={(e) => setC({ ...c, min_order: Number(e.target.value) })} /></div>
        <div><Label>Description</Label><Input value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} /></div>
        <div className="flex items-end"><Button variant="print" className="w-full" type="submit"><Plus /> Add</Button></div>
      </form>
      {coupons.map((x) => (
        <div key={x.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div>
            <p className="font-mono font-bold">{x.code} <span className="font-sans font-normal">— {x.percent}% off{Number(x.min_order) > 0 ? ` above ${inr(Number(x.min_order))}` : ""}</span></p>
            <p className="text-sm text-muted-foreground">{x.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={x.active} onCheckedChange={async (v) => { await supabase.from("coupons").update({ active: v }).eq("code", x.code); refresh(); }} />
              {x.active ? "Active" : "Off"}
            </label>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={async () => { if (!confirm(`Delete ${x.code}?`)) return; await supabase.from("coupons").delete().eq("code", x.code); refresh(); }}><Trash2 /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Customers ---------- */
function CustomersTab({ orders }: { orders: OrderRow[] }) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border-2 bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left"><tr>{["Name", "Phone", "City", "Orders", "Spent", "Joined"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>
          {profiles.map((p) => {
            const mine = orders.filter((o) => o.user_id === p.id);
            return (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{p.full_name ?? "—"}</td>
                <td className="p-3">{p.phone ?? "—"}</td>
                <td className="p-3">{p.city ?? "—"}</td>
                <td className="p-3">{mine.length}</td>
                <td className="p-3">{inr(mine.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0))}</td>
                <td className="p-3">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
