REVOKE ALL ON FUNCTION public.generate_anon_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_identity() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_identity(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_anon_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_identity() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_identity(uuid) TO authenticated, service_role;