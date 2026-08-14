-- Reports table for user-submitted moderation reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post','comment')),
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX idx_reports_status ON public.reports (status);
CREATE INDEX idx_reports_created_at ON public.reports (created_at DESC);

-- RPC: get pending reports with content and author details
CREATE OR REPLACE FUNCTION public.pending_reports()
RETURNS TABLE (
  id uuid,
  target_type text,
  target_id uuid,
  reporter_id uuid,
  reason text,
  created_at timestamptz,
  content text,
  content_is_deleted boolean,
  author_anon_id text,
  post_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.target_type,
    r.target_id,
    r.reporter_id,
    r.reason,
    r.created_at,
    CASE
      WHEN r.target_type = 'post' THEN p.content
      WHEN r.target_type = 'comment' THEN c.content
    END AS content,
    CASE
      WHEN r.target_type = 'post' THEN COALESCE(p.is_deleted, false)
      WHEN r.target_type = 'comment' THEN COALESCE(c.is_deleted, false)
    END AS content_is_deleted,
    CASE
      WHEN r.target_type = 'post' THEN u_post.anon_id
      WHEN r.target_type = 'comment' THEN u_comment.anon_id
    END AS author_anon_id,
    CASE
      WHEN r.target_type = 'post' THEN p.id
      WHEN r.target_type = 'comment' THEN c.post_id
    END AS post_id
  FROM public.reports r
  LEFT JOIN public.posts p ON r.target_type = 'post' AND r.target_id = p.id
  LEFT JOIN public.comments c ON r.target_type = 'comment' AND r.target_id = c.id
  LEFT JOIN public.users u_post ON p.user_id = u_post.id
  LEFT JOIN public.users u_comment ON c.user_id = u_comment.id
  WHERE r.status = 'pending' AND public.is_admin(auth.uid())
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.pending_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_reports() TO authenticated, service_role;

-- RLS: Only admins can access reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins read reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Only admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.reports TO authenticated;
GRANT INSERT ON public.reports TO authenticated;
GRANT UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
