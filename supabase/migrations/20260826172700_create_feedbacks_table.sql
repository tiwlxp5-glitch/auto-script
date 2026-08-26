-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback"
    ON public.feedbacks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view their own feedback (optional, but good practice)
CREATE POLICY "Users can view their own feedback"
    ON public.feedbacks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index on created_at for faster sorting/analytics later
CREATE INDEX IF NOT EXISTS feedbacks_created_at_idx ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS feedbacks_user_id_idx ON public.feedbacks(user_id);
