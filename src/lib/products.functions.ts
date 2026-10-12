import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import type { Option } from "./site";

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  base_price: number;
  sizes: Option[];
  papers: Option[];
  quantities: number[];
  turnaround: string | null;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("products")
    .select("id, slug, name, tagline, description, base_price, sizes, papers, quantities, turnaround")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as unknown as Product[];
});

export const productsQuery = queryOptions({ queryKey: ["products"], queryFn: () => listProducts() });
