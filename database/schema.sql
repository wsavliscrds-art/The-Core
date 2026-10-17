BEGIN;
CREATE TABLE IF NOT EXISTS public.core_items (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('task','habit','trip','note')),
 title text NOT NULL,
 due_date date,
 data jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS core_items_due ON public.core_items(user_id,due_date);
ALTER TABLE public.core_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='core_items' AND policyname='own_records') THEN
 CREATE POLICY own_records ON public.core_items FOR ALL TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
 END IF;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.core_items TO authenticated;
REVOKE ALL ON public.core_items FROM anon;
CREATE OR REPLACE FUNCTION public.core_item_limit() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 1));
 IF (SELECT count(*) FROM public.core_items WHERE user_id=NEW.user_id) >= 1000 THEN
 RAISE EXCEPTION 'Limite de 1.000 registros por conta atingido.' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER core_item_limit BEFORE INSERT ON public.core_items FOR EACH ROW EXECUTE FUNCTION public.core_item_limit();
CREATE TABLE IF NOT EXISTS public.core_migrations (name text PRIMARY KEY, owner_id uuid, completed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.core_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.core_migrations FROM anon, authenticated;
COMMIT;
