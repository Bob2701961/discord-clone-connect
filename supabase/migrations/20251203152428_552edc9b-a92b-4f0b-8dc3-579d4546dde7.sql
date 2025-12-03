-- Drop ALL existing policies on dm_channels
DROP POLICY IF EXISTS "Users can create DM channels" ON public.dm_channels;
DROP POLICY IF EXISTS "Users can view their DM channels" ON public.dm_channels;

-- Create PERMISSIVE policies
CREATE POLICY "Users can create DM channels"
ON public.dm_channels
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their DM channels"
ON public.dm_channels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dm_participants
    WHERE dm_participants.dm_channel_id = dm_channels.id
    AND dm_participants.user_id = auth.uid()
  )
);