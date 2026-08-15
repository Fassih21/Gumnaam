-- =========================================================
-- Security fixes: impersonation bug, keyword moderation
--    enforcement, blocked_keywords exposure, realtime enable.
-- =========================================================

-- 1. Fix impersonation bug: UPDATE policies allowed rewriting
--    user_id to anyone. WITH CHECK must mirror USING.
DROP POLICY IF EXISTS "Users update own posts or admins" ON public.posts;
CREATE POLICY "Users update own posts or admins"
  ON public.posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users update own comments or admins" ON public.comments;
CREATE POLICY "Users update own comments or admins"
  ON public.comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 2. Enforce keyword moderation at insert/edit time.
--    Substring match (ILIKE) is used instead of regex word-boundary
--    matching to avoid having to escape regex metacharacters in
--    admin-entered keywords. Trade-off: it can match inside a larger
--    word (e.g. keyword "ass" matches "class"). Tighten later if
--    false positives become a problem (e.g. store keywords already
--    regex-escaped, or switch to a dedicated text-search approach).
CREATE OR REPLACE FUNCTION public.enforce_keyword_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hit boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_keywords bk
    WHERE NEW.content ILIKE '%' || bk.keyword || '%'
  ) INTO hit;

  IF hit THEN
    RAISE EXCEPTION 'Content blocked: contains a restricted term';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_keyword_check ON public.posts;
CREATE TRIGGER posts_keyword_check
  BEFORE INSERT OR UPDATE OF content ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_keyword_moderation();

DROP TRIGGER IF EXISTS comments_keyword_check ON public.comments;
CREATE TRIGGER comments_keyword_check
  BEFORE INSERT OR UPDATE OF content ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_keyword_moderation();

-- 3. blocked_keywords should only be readable by admins, not every
--    signed-in user (prevents easy bypass via spelling variations).
--    The table-level GRANT SELECT stays (authenticated still needs
--    permission to query the table at all) — the RLS policy below is
--    what actually filters which rows come back, so non-admins get
--    zero rows instead of the full keyword list.
DROP POLICY IF EXISTS "Signed-in users read blocked keywords" ON public.blocked_keywords;
CREATE POLICY "Only admins read blocked keywords"
  ON public.blocked_keywords FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. Enable realtime so the feed updates without a manual refresh.
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;