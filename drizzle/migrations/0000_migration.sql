
create type public.app_role as enum ('admin','customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, address text, city text, pincode text, company text, gst_number text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  base_price numeric not null default 1,
  sizes jsonb not null default '[]',
  papers jsonb not null default '[]',
  quantities jsonb not null default '[]',
  turnaround text default '2-3 days',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.coupons (
  code text primary key,
  percent int not null check (percent between 1 and 90),
  min_order numeric not null default 0,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "admin coupons" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('GP' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5))),
  user_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text, paper text, quantity int not null,
  file_path text, file_name text, notes text,
  subtotal numeric not null, discount numeric not null default 0, delivery_fee numeric not null default 0, total numeric not null,
  coupon_code text,
  delivery_method text not null,
  customer_name text, phone text, address text, city text, pincode text,
  status text not null default 'placed',
  payment_method text not null default 'online',
  payment_status text not null default 'pending',
  razorpay_order_id text, razorpay_payment_id text,
  tracking_number text, courier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "upload own files" on storage.objects for insert to authenticated with check (bucket_id = 'order-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own files" on storage.objects for select to authenticated using (bucket_id = 'order-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

insert into public.products (slug,name,tagline,description,base_price,sizes,papers,quantities,turnaround,sort_order) values
('business-cards','Business Cards','First impressions, pressed sharp.','Premium cards with crisp edges and rich colour.',2.5,
 '[{"label":"Standard 3.5×2 in","m":1},{"label":"Square 2.5×2.5 in","m":1.1},{"label":"Slim 3.5×1.5 in","m":0.95}]',
 '[{"label":"350gsm Matte","m":1},{"label":"400gsm Gloss","m":1.2},{"label":"Textured Linen","m":1.5}]','[100,250,500,1000]','2-3 days',1),
('flyers','Flyers','Get the word out, loud.','Vibrant flyers for events, menus and promotions.',4,
 '[{"label":"A6","m":0.7},{"label":"A5","m":1},{"label":"A4","m":1.6}]',
 '[{"label":"130gsm Gloss","m":1},{"label":"170gsm Matte","m":1.25},{"label":"250gsm Silk","m":1.5}]','[50,100,250,500,1000]','2 days',2),
('banners','Banners','Big, bold and built to last.','Weatherproof flex and vinyl banners for any venue.',350,
 '[{"label":"2×3 ft","m":1},{"label":"3×6 ft","m":2.6},{"label":"4×8 ft","m":4.5}]',
 '[{"label":"Star Flex","m":1},{"label":"Premium Vinyl","m":1.4},{"label":"Backlit Flex","m":1.7}]','[1,2,5,10]','1-2 days',3),
('brochures','Brochures','Tell the whole story.','Bi-fold and tri-fold brochures with clean folds.',12,
 '[{"label":"A4 Bi-fold","m":1},{"label":"A4 Tri-fold","m":1.15},{"label":"A3 Bi-fold","m":1.8}]',
 '[{"label":"170gsm Gloss","m":1},{"label":"200gsm Matte","m":1.2},{"label":"250gsm Art","m":1.45}]','[50,100,250,500]','3-4 days',4),
('books','Books','From manuscript to bookshelf.','Perfect-bound and hardcover books, priced per copy (up to 100 pages).',180,
 '[{"label":"A5 Paperback","m":1},{"label":"A4 Paperback","m":1.6},{"label":"A5 Hardcover","m":2.2}]',
 '[{"label":"70gsm Maplitho","m":1},{"label":"80gsm Natural Shade","m":1.15},{"label":"100gsm Art","m":1.5}]','[10,25,50,100,250]','5-7 days',5),
('stickers','Stickers','Stick it everywhere.','Die-cut and kiss-cut stickers in vivid colour.',3,
 '[{"label":"2×2 in","m":1},{"label":"3×3 in","m":1.5},{"label":"4×4 in","m":2.2}]',
 '[{"label":"Paper Gloss","m":1},{"label":"Vinyl Waterproof","m":1.6},{"label":"Holographic","m":2.4}]','[50,100,250,500,1000]','2-3 days',6),
('invitations','Invitations','Moments worth announcing.','Wedding, party and corporate invitations with envelopes.',25,
 '[{"label":"5×7 in","m":1},{"label":"A5","m":1.1},{"label":"Square 6×6 in","m":1.15}]',
 '[{"label":"300gsm Matte","m":1},{"label":"Metallic Pearl","m":1.5},{"label":"Handmade Cotton","m":2}]','[25,50,100,250,500]','3-5 days',7),
('custom-printing','Custom Printing','Your idea, our presses.','Anything else — menus, tags, certificates, packaging. We will confirm details on WhatsApp.',10,
 '[{"label":"Small (up to A5)","m":1},{"label":"Medium (A4)","m":1.8},{"label":"Large (A3+)","m":3.2}]',
 '[{"label":"Standard","m":1},{"label":"Premium","m":1.4},{"label":"Luxury","m":2}]','[10,50,100,500]','Varies',8);

insert into public.coupons (code, percent, min_order, description) values
('WELCOME10',10,0,'10% off your first order'),('BULK20',20,5000,'20% off orders above ₹5,000');
