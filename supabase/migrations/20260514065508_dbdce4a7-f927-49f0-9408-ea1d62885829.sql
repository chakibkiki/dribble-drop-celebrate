CREATE TABLE public.animator_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animator_name TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_type TEXT NOT NULL CHECK (store_type IN ('top_mt','mt','mm')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.animator_sessions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.prize_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.animator_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL CHECK (tier IN (1,2,3)),
  gift_key TEXT NOT NULL,
  gift_label TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_participants_session ON public.participants(session_id);
CREATE INDEX idx_prizes_session ON public.prize_distributions(session_id);

ALTER TABLE public.animator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_sessions" ON public.animator_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_participants" ON public.participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_prizes" ON public.prize_distributions FOR ALL USING (true) WITH CHECK (true);