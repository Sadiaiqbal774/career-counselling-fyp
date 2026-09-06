-- Run this once in the Supabase SQL editor for an existing installation.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intermediate_marks TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intermediate_group TEXT NOT NULL DEFAULT 'Pre-Engineering';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entry_test TEXT NOT NULL DEFAULT 'ECAT';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entry_test_score TEXT NOT NULL DEFAULT '';