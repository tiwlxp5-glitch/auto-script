-- Grant UPDATE permission to authenticated users for Brand Voice Memory columns
GRANT UPDATE (creator_name, catchphrase, target_audience, custom_tone, is_brand_voice_enabled) ON public.profiles TO authenticated;
