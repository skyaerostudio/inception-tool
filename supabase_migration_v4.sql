-- Migration V4: Add pic column for activity resource assignment to activities table

ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS pic TEXT;
