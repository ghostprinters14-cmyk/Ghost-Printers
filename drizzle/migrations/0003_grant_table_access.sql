GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.coupons TO authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.products, public.coupons, public.orders, public.profiles, public.user_roles TO service_role;