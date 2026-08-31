-- Add Brand Voice Memory columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_name VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS catchphrase VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_tone VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_brand_voice_enabled BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.creator_name IS 'The creator''s name or pronoun used in scripts';
COMMENT ON COLUMN public.profiles.catchphrase IS 'The creator''s signature catchphrase or closing remark';
COMMENT ON COLUMN public.profiles.target_audience IS 'The target audience for the scripts';
COMMENT ON COLUMN public.profiles.custom_tone IS 'The specific tone of voice for the scripts';
COMMENT ON COLUMN public.profiles.is_brand_voice_enabled IS 'Toggle to enable or disable the brand voice feature';
