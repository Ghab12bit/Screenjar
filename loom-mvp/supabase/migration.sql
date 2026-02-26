-- Run this in Supabase SQL Editor

CREATE TABLE public.videos (
  id TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Untitled Recording',
  file_key TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  duration FLOAT DEFAULT 0,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view videos" ON public.videos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
