-- Allow users to view servers by invite code (for joining)
CREATE POLICY "Servers viewable by invite code"
ON public.servers
FOR SELECT
TO authenticated
USING (invite_code IS NOT NULL);