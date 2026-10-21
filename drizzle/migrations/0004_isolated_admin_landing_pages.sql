CREATE TABLE public.landing_pages (
 slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$' AND slug NOT IN ('admin','auth','api','index')),
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.landing_pages TO anon, authenticated;
GRANT UPDATE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.page_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 page_slug text NOT NULL REFERENCES public.landing_pages(slug),
 user_id uuid,
 email text NOT NULL,
 UNIQUE(page_slug,email)
);
GRANT SELECT ON public.page_members TO authenticated;
GRANT ALL ON public.page_members TO service_role;
ALTER TABLE public.page_members ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_manage_page(_slug text, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _user_id IS NOT NULL AND (public.has_role(_user_id,'owner') OR EXISTS (
 SELECT 1 FROM public.page_members m JOIN auth.users u ON u.id=_user_id
 WHERE m.page_slug=_slug AND (m.user_id=_user_id OR (lower(m.email)=lower(u.email) AND u.email_confirmed_at IS NOT NULL))
 ));
$$;
REVOKE ALL ON FUNCTION public.can_manage_page(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_page(text,uuid) TO authenticated;
CREATE POLICY "Public page settings" ON public.landing_pages FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "Members update their page" ON public.landing_pages FOR UPDATE TO authenticated USING (public.can_manage_page(slug,auth.uid())) WITH CHECK (public.can_manage_page(slug,auth.uid()));
CREATE POLICY "Members see their assignments" ON public.page_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner') OR user_id=auth.uid() OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND lower(u.email)=lower(page_members.email) AND u.email_confirmed_at IS NOT NULL));
CREATE OR REPLACE FUNCTION public.assign_page_admin(_slug text,_email text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only owners can assign pages'; END IF;
 IF _slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' OR _slug IN ('admin','auth','api','index') THEN RAISE EXCEPTION 'Invalid page address'; END IF;
 IF trim(_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(trim(_email)) AND email_confirmed_at IS NOT NULL;
 INSERT INTO public.landing_pages(slug,settings) SELECT _slug,to_jsonb(a)-'id'-'updated_at' || jsonb_build_object('apk_url',null) FROM public.app_settings a WHERE a.id=1 ON CONFLICT DO NOTHING;
 INSERT INTO public.page_members(page_slug,email,user_id) VALUES (_slug,lower(trim(_email)),uid) ON CONFLICT(page_slug,email) DO UPDATE SET user_id=excluded.user_id;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_page_admin(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_page_admin(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.is_page_member(_email text,_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id AND lower(email)=lower(_email) AND email_confirmed_at IS NOT NULL) $$;
REVOKE ALL ON FUNCTION public.is_page_member(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_page_member(text,uuid) TO authenticated;
DROP POLICY "Members see their assignments" ON public.page_members;
CREATE POLICY "Members see their assignments" ON public.page_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner') OR user_id=auth.uid() OR public.is_page_member(email,auth.uid()));
ALTER TABLE public.page_visits ADD COLUMN page_slug text REFERENCES public.landing_pages(slug);
DROP POLICY "Staff can read visits" ON public.page_visits;
CREATE POLICY "Read only own page visits" ON public.page_visits FOR SELECT TO authenticated USING ((page_slug IS NULL AND public.is_staff(auth.uid())) OR (page_slug IS NOT NULL AND public.can_manage_page(page_slug,auth.uid())));
DROP POLICY "Anyone can record a visit" ON public.page_visits;
CREATE POLICY "Record page visits" ON public.page_visits FOR INSERT TO anon,authenticated WITH CHECK ((page_slug IS NULL AND path='/') OR (page_slug IS NOT NULL AND path='/'||page_slug));
CREATE INDEX page_visits_slug_time_idx ON public.page_visits(page_slug,visited_at);
DROP POLICY "Staff upload apks" ON storage.objects;
DROP POLICY "Staff read apks" ON storage.objects;
DROP POLICY "Staff update apks" ON storage.objects;
DROP POLICY "Staff delete apks" ON storage.objects;
CREATE POLICY "Scoped APK upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='apks' AND ((position('/' in name)=0 AND public.is_staff(auth.uid())) OR public.can_manage_page(split_part(name,'/',1),auth.uid())));
CREATE POLICY "Scoped APK read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='apks' AND ((position('/' in name)=0 AND public.is_staff(auth.uid())) OR public.can_manage_page(split_part(name,'/',1),auth.uid())));
CREATE POLICY "Scoped APK update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='apks' AND ((position('/' in name)=0 AND public.is_staff(auth.uid())) OR public.can_manage_page(split_part(name,'/',1),auth.uid()))) WITH CHECK (bucket_id='apks' AND ((position('/' in name)=0 AND public.is_staff(auth.uid())) OR public.can_manage_page(split_part(name,'/',1),auth.uid())));
CREATE POLICY "Scoped APK delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='apks' AND ((position('/' in name)=0 AND public.is_staff(auth.uid())) OR public.can_manage_page(split_part(name,'/',1),auth.uid())));