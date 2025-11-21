-- Drop the problematic policy
DROP POLICY IF EXISTS "Server members viewable by members" ON public.server_members;

-- Create a security definer function to check server membership
CREATE OR REPLACE FUNCTION public.is_server_member(_server_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.server_members
    WHERE server_id = _server_id
      AND user_id = _user_id
  )
$$;

-- Recreate the policy using the function
CREATE POLICY "Server members viewable by members" 
ON public.server_members 
FOR SELECT 
USING (
  public.is_server_member(server_id, auth.uid())
);