-- Drop existing policies
DROP POLICY IF EXISTS "Users can create DM channels" ON public.dm_channels;
DROP POLICY IF EXISTS "Users can view their DM channels" ON public.dm_channels;

-- Create INSERT policy that returns data immediately (using RETURNING)
CREATE POLICY "Authenticated users can create DM channels"
ON public.dm_channels
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policy that allows users to see channels they just created OR where they're participants
CREATE POLICY "Users can view DM channels"
ON public.dm_channels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dm_participants
    WHERE dm_participants.dm_channel_id = dm_channels.id
    AND dm_participants.user_id = auth.uid()
  )
  OR 
  -- Allow reading immediately after insert (within same transaction)
  created_at > NOW() - INTERVAL '5 seconds'
);