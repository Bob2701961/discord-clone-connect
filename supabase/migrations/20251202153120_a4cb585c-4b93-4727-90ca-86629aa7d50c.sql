-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view DM participants" ON public.dm_participants;

-- Create a simple non-recursive policy
CREATE POLICY "Users can view DM participants" 
ON public.dm_participants 
FOR SELECT 
USING (user_id = auth.uid());