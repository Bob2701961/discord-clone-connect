-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create DM channels" ON public.dm_channels;

-- Create a new PERMISSIVE INSERT policy for authenticated users
CREATE POLICY "Users can create DM channels"
ON public.dm_channels
FOR INSERT
TO authenticated
WITH CHECK (true);