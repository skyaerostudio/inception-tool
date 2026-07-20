-- Migration V2: Add Divisions & Squads organization system

-- 1. Divisions lookup table
CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Squads lookup table
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add FK columns to projects table
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL;

-- 4. Row Level Security for new tables
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon public access on divisions" ON public.divisions;
CREATE POLICY "Allow anon public access on divisions"
ON public.divisions FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon public access on squads" ON public.squads;
CREATE POLICY "Allow anon public access on squads"
ON public.squads FOR ALL
USING (true)
WITH CHECK (true);
