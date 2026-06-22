-- ROOMS
CREATE TABLE public.rooms (
  team TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated BOOLEAN NOT NULL DEFAULT false,
  score INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms read all" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms insert all" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms update all" ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "rooms delete all" ON public.rooms FOR DELETE USING (true);

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- CONNECTIONS
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team TEXT NOT NULL REFERENCES public.rooms(team) ON DELETE CASCADE,
  src TEXT NOT NULL,
  tgt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX connections_team_pair_unique
  ON public.connections (team, LEAST(src, tgt), GREATEST(src, tgt));

CREATE INDEX connections_team_idx ON public.connections (team);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connections read all" ON public.connections FOR SELECT USING (true);
CREATE POLICY "connections insert all" ON public.connections FOR INSERT WITH CHECK (true);
CREATE POLICY "connections update all" ON public.connections FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "connections delete all" ON public.connections FOR DELETE USING (true);

ALTER TABLE public.connections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;

-- updated_at trigger for rooms
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily purge of rooms older than 24h (cascades to connections)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-old-rooms',
  '0 3 * * *',
  $$ DELETE FROM public.rooms WHERE created_at < now() - interval '24 hours' $$
);