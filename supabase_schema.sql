-- Supabase Database Schema for Project Schedule Calendar Planner

-- Enable UUID extension if required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mandays INTEGER NOT NULL DEFAULT 1,
    start_mode TEXT NOT NULL DEFAULT 'after_prev',
    offset_days INTEGER DEFAULT 0,
    manual_start_date DATE,
    remarks TEXT,
    position_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, project_id)
);

-- Index for activity lookup by project
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON public.activities(project_id);

-- 3. Row Level Security (RLS) setup
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Public Anonymous Access Policies
DROP POLICY IF EXISTS "Allow anon public access on projects" ON public.projects;
CREATE POLICY "Allow anon public access on projects" 
ON public.projects FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon public access on activities" ON public.activities;
CREATE POLICY "Allow anon public access on activities" 
ON public.activities FOR ALL 
USING (true) 
WITH CHECK (true);
