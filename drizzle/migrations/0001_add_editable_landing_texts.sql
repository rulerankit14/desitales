ALTER TABLE public.app_settings
  ADD COLUMN badge_text TEXT NOT NULL DEFAULT 'FREE VIDEO CALLS',
  ADD COLUMN feature_1 TEXT NOT NULL DEFAULT 'Instant HD video connection',
  ADD COLUMN feature_2 TEXT NOT NULL DEFAULT 'Private & secure calls',
  ADD COLUMN feature_3 TEXT NOT NULL DEFAULT '100% free – no hidden charges';