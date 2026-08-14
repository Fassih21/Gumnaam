-- Adds the ability for admins to ban/unban a user by anon handle.
-- A banned user can still log in and read the feed, but cannot create
-- new posts, comments, or reactions.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- helper: ban check without RLS recursion (mirrors is_admin)
CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT u.is_banned FROM public.users u WHERE u.id = _user_id), false);
$$;

REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated, service_role;

-- Everyone can see whether an anon handle is banned (mirrors is_admin visibility).
GRANT SELECT (is_banned) ON public.users TO authenticated;

-- Only admins can flip the ban flag; column-level grant + admin-only RLS policy.
GRANT UPDATE (is_banned) ON public.users TO authenticated;

DROP POLICY IF EXISTS "Admins manage ban status" ON public.users;
CREATE POLICY "Admins manage ban status"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Banned users can no longer create posts, comments, or reactions.
ALTER POLICY "Users create their own posts"
  ON public.posts
  WITH CHECK (user_id = auth.uid() AND NOT public.is_banned(auth.uid()));

ALTER POLICY "Users create their own comments"
  ON public.comments
  WITH CHECK (user_id = auth.uid() AND NOT public.is_banned(auth.uid()));

ALTER POLICY "Users manage their own reactions"
  ON public.reactions
  WITH CHECK (user_id = auth.uid() AND NOT public.is_banned(auth.uid()));

-- my_identity() now also reports ban status to the signed-in user.
CREATE OR REPLACE FUNCTION public.my_identity()
RETURNS TABLE (id uuid, anon_id text, name text, uol_email text, is_admin boolean, is_banned boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.anon_id, u.name, u.uol_email, u.is_admin, u.is_banned
  FROM public.users u WHERE u.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_identity() TO authenticated;