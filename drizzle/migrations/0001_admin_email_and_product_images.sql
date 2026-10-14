alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists category text not null default 'General';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  if lower(new.email) = 'ghostprinters14@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;

create policy "admin upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "admin update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "admin delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "admin read profiles all" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));