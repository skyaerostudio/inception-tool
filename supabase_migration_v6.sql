-- Migration V6: Add pic_id and pic_ids columns for multi-PIC assignment tracking in activities table

ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS pic_id TEXT,
    ADD COLUMN IF NOT EXISTS pic_ids JSONB;
