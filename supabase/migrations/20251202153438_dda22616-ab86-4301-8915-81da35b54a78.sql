-- Fix the dm_channels INSERT policy to be PERMISSIVE
DROP POLICY IF EXISTS "Users can create DM channels" ON public.dm_channels;

CREATE POLICY "Users can create DM channels" 
ON public.dm_channels 
FOR INSERT 
TO authenticated
WITH CHECK (true);