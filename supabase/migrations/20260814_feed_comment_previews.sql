CREATE OR REPLACE FUNCTION public.feed_comment_previews(_post_ids uuid[], _limit int DEFAULT 2)
RETURNS TABLE (
  post_id uuid,
  comment_id uuid,
  content text,
  created_at timestamptz,
  anon_id text,
  total_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS post_id,
    c.id AS comment_id,
    c.content,
    c.created_at,
    u.anon_id,
    (SELECT count(*)::integer FROM public.comments cc
       WHERE cc.post_id = p.id AND cc.is_deleted = false) AS total_count
  FROM unnest(_post_ids) AS p(id)
  LEFT JOIN LATERAL (
    SELECT * FROM public.comments
    WHERE post_id = p.id AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT _limit
  ) c ON true
  LEFT JOIN public.users u ON u.id = c.user_id;
$$;

REVOKE ALL ON FUNCTION public.feed_comment_previews(uuid[], int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feed_comment_previews(uuid[], int) TO authenticated, service_role;