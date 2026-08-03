-- Migration V3: Add actual_start_date and actual_end_date columns to activities table

ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS actual_start_date DATE,
    ADD COLUMN IF NOT EXISTS actual_end_date DATE;
