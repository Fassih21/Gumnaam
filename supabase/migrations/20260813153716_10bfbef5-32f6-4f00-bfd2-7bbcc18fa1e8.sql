-- helper: unique Anon#XXXX generator
CREATE OR REPLACE FUNCTION public.generate_anon_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'Anon#' || lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users u WHERE u.anon_id = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  uol_email text NOT NULL UNIQUE CHECK (uol_email ~* '^[A-Za-z0-9._%+-]+@student\.uol\.edu\.pk$'),
  name text NOT NULL,
  anon_id text NOT NULL UNIQUE DEFAULT public.generate_anon_id(),
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post','comment')),
  target_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('upvote','downvote')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE public.trusts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truster_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trusted_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (truster_id, trusted_id),
  CHECK (truster_id <> trusted_id)
);

CREATE TABLE public.blocked_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- is_admin lookup without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = _user_id AND u.is_admin);
$$;

-- Admin-only identity lookup behind an anon handle
CREATE OR REPLACE FUNCTION public.admin_identity(_user_id uuid)
RETURNS TABLE (id uuid, anon_id text, name text, uol_email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT u.id, u.anon_id, u.name, u.uol_email FROM public.users u WHERE u.id = _user_id;
END;
$$;

-- Own identity (name/email) without exposing columns broadly
CREATE OR REPLACE FUNCTION public.my_identity()
RETURNS TABLE (id uuid, anon_id text, name text, uol_email text, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.anon_id, u.name, u.uol_email, u.is_admin
  FROM public.users u WHERE u.id = auth.uid();
$$;

-- COLUMN-LEVEL privacy: authenticated may never read name / uol_email directly
GRANT SELECT (id, anon_id, is_admin, created_at) ON public.users TO authenticated;
GRANT INSERT (id, uol_email, name) ON public.users TO authenticated;
GRANT UPDATE (name) ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactions TO authenticated;
GRANT ALL ON public.reactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusts TO authenticated;
GRANT ALL ON public.trusts TO service_role;
GRANT SELECT ON public.blocked_keywords TO authenticated;
GRANT ALL ON public.blocked_keywords TO service_role;

GRANT EXECUTE ON FUNCTION public.my_identity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_identity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon identities are readable by signed-in users"
  ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert their own profile"
  ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update their own profile"
  ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Signed-in users read live posts"
  ON public.posts FOR SELECT TO authenticated USING (is_deleted = false OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users create their own posts"
  ON public.posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own posts or admins"
  ON public.posts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (true);
CREATE POLICY "Users delete own posts or admins"
  ON public.posts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Signed-in users read live comments"
  ON public.comments FOR SELECT TO authenticated USING (is_deleted = false OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users create their own comments"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own comments or admins"
  ON public.comments FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (true);
CREATE POLICY "Users delete own comments or admins"
  ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Signed-in users read reactions"
  ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage their own reactions"
  ON public.reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update their own reactions"
  ON public.reactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove their own reactions"
  ON public.reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users read their own trusts"
  ON public.trusts FOR SELECT TO authenticated USING (truster_id = auth.uid() OR trusted_id = auth.uid());
CREATE POLICY "Users create their own trusts"
  ON public.trusts FOR INSERT TO authenticated WITH CHECK (truster_id = auth.uid());
CREATE POLICY "Users remove their own trusts"
  ON public.trusts FOR DELETE TO authenticated USING (truster_id = auth.uid());

CREATE POLICY "Signed-in users read blocked keywords"
  ON public.blocked_keywords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage blocked keywords"
  ON public.blocked_keywords FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX idx_comments_post_id ON public.comments (post_id, created_at);
CREATE INDEX idx_reactions_target ON public.reactions (target_type, target_id);