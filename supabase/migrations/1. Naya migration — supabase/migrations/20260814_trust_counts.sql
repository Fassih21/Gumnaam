CREATE OR REPLACE FUNCTION public.trust_counts(_user_ids uuid[])
RETURNS TABLE(user_id uuid, count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trusted_id, count(*)::integer
  FROM public.trusts
  WHERE trusted_id = ANY(_user_ids)
  GROUP BY trusted_id;
$$;

REVOKE ALL ON FUNCTION public.trust_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trust_counts(uuid[]) TO authenticated, service_role;