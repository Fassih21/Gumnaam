-- Lets any signed-in user flag a post or comment for admin review.
-- Reporters stay anonymous to everyone except admins (who can already
-- see anon handles); only admins can read or resolve reports.

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post','comment')),
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Any signed-in, non-banned user can file a report as themselves.
CREATE POLICY "Users file their own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND NOT public.is_banned(auth.uid()));

-- Only admins can read or update reports — reporters cannot see the queue.
CREATE POLICY "Admins read reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins resolve reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX reports_status_idx ON public.reports (status, created_at DESC);

-- Fetches pending reports joined with a snippet of the reported content
-- and the reported author's anon handle, for the admin queue.
CREATE OR REPLACE FUNCTION public.pending_reports()
RETURNS TABLE (
  id uuid,
  target_type text,
  target_id uuid,
  reason text,
  created_at timestamptz,
  content text,
  content_is_deleted boolean,
  author_anon_id text,
  post_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at,
         COALESCE(p.content, c.content) AS content,
         COALESCE(p.is_deleted, c.is_deleted, true) AS content_is_deleted,
         u.anon_id AS author_anon_id,
         COALESCE(p.id, c.post_id) AS post_id
  FROM public.reports r
  LEFT JOIN public.posts p ON r.target_type = 'post' AND p.id = r.target_id
  LEFT JOIN public.comments c ON r.target_type = 'comment' AND c.id = r.target_id
  LEFT JOIN public.users u ON u.id = COALESCE(p.user_id, c.user_id)
  WHERE r.status = 'pending'
  ORDER BY r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.pending_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_reports() TO authenticated, service_role;