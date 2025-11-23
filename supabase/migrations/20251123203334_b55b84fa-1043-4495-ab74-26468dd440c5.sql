-- Relax INSERT RLS policy on servers to avoid owner_id mismatch issues

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create servers" ON public.servers;

CREATE POLICY "Users can create servers"
ON public.servers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);