-- Migration V4: Add Roles, Users, PIC assignment, and Activity Status

-- 1. Roles lookup table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    avatar_color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add pic_id and status columns to activities table
ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS pic_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'To Do';

-- 4. Enable Row Level Security (RLS) for new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon public access on roles" ON public.roles;
CREATE POLICY "Allow anon public access on roles"
ON public.roles FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon public access on users" ON public.users;
CREATE POLICY "Allow anon public access on users"
ON public.users FOR ALL
USING (true)
WITH CHECK (true);

-- Insert Default Seed Roles
INSERT INTO public.roles (name, description) VALUES
    ('Business Analyst', 'Requirements gathering, BRD creation, and business flow mapping'),
    ('QA Tester', 'Quality assurance, test execution, and bug tracking'),
    ('Frontend Dev', 'UI component design and frontend application logic'),
    ('Backend Dev', 'API design, database modeling, and server business logic'),
    ('Fullstack Dev', 'End-to-end fullstack web development'),
    ('Tech Lead', 'Technical architecture design and code review leadership'),
    ('Project Manager', 'Project planning, activity tracking, and resource management'),
    ('UI/UX Designer', 'Product design, wireframes, and design system creation'),
    ('DevOps', 'CI/CD pipeline, cloud infrastructure, and deployment management')
ON CONFLICT (name) DO NOTHING;
