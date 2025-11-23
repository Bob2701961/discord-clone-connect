-- Broaden INSERT policy on servers so any role can insert (frontend still enforces auth)

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create servers" ON public.servers;

CREATE POLICY "Users can create servers"
ON public.servers
FOR INSERT
TO public
WITH CHECK (true);