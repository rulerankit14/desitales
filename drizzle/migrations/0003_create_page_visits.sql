CREATE TABLE public.page_visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  path TEXT NOT NULL DEFAULT '/'
);

GRANT INSERT ON public.page_visits TO anon, authenticated;
GRANT SELECT ON public.page_visits TO authenticated;
GRANT ALL ON public.page_visits TO service_role;

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a visit"
ON public.page_visits FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff can read visits"
ON public.page_visits FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX page_visits_visited_at_idx ON public.page_visits (visited_at);