-- Create mood_entries table
CREATE TABLE public.mood_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood TEXT NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  note TEXT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read and insert (since no auth yet)
CREATE POLICY "Anyone can view mood entries" 
ON public.mood_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create mood entries" 
ON public.mood_entries 
FOR INSERT 
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_mood_entries_created_at ON public.mood_entries(created_at DESC);
CREATE INDEX idx_mood_entries_mood ON public.mood_entries(mood);