-- ============================================================================
-- SUPABASE AUTHENTICATION & SECURITY GUIDE (v5)
-- ============================================================================
-- 
-- Email Authentication is built-in to Supabase and works out-of-the-box.
-- No custom tables or SQL migrations are strictly required for email sign-up/sign-in.
--
-- OPTIONAL: If you want to enable Row Level Security (RLS) on existing tables
-- to allow only authenticated users to read and write data, run the commands below:

-- 1. Enable RLS on core workspace tables
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users full access to workspace resources
CREATE POLICY "Allow authenticated users full access on projects"
ON projects FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access on activities"
ON activities FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access on divisions"
ON divisions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access on squads"
ON squads FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access on users_list"
ON users_list FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access on roles"
ON roles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
