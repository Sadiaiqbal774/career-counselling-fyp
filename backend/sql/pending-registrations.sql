-- Run this script in the Supabase SQL editor before enabling email registration.
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_ciphertext TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  security_question TEXT NOT NULL,
  security_answer_ciphertext TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_registrations_expires_at_idx
  ON public.pending_registrations (expires_at);

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
