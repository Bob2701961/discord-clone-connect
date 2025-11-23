-- Fix RLS on servers so owners can create and immediately see their own servers

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Replace existing SELECT and INSERT policies with owner-aware versions
DROP POLICY IF EXISTS "Servers viewable by members" ON public.servers;
DROP POLICY IF EXISTS "Servers viewable by members or owners" ON public.servers;
DROP POLICY IF EXISTS "Users can create servers" ON public.servers;

-- Allow members OR owners to view servers
CREATE POLICY "Servers viewable by members or owners"
ON public.servers
FOR SELECT
USING (
  (
    EXISTS (
      SELECT 1
      FROM public.server_members
      WHERE server_members.server_id = servers.id
        AND server_members.user_id = auth.uid()
    )
  )
  OR auth.uid() = owner_id
);

-- Allow authenticated users to create servers they own
CREATE POLICY "Users can create servers"
ON public.servers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);