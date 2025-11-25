-- Create permissions enum
CREATE TYPE public.role_permission AS ENUM (
  'manage_channels',
  'manage_roles', 
  'kick_members',
  'ban_members',
  'send_messages'
);

-- Create custom roles table
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99AAB5',
  position INTEGER DEFAULT 0,
  permissions role_permission[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(server_id, name)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_roles
CREATE POLICY "Server members can view custom roles"
ON public.custom_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_members.server_id = custom_roles.server_id
    AND server_members.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage custom roles"
ON public.custom_roles FOR ALL
USING (has_server_role_level(server_id, auth.uid(), 'admin'::server_role));

-- Create role assignments table
CREATE TABLE public.role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, custom_role_id, server_id)
);

-- Enable RLS
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_assignments
CREATE POLICY "Server members can view role assignments"
ON public.role_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_members.server_id = role_assignments.server_id
    AND server_members.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage role assignments"
ON public.role_assignments FOR ALL
USING (has_server_role_level(server_id, auth.uid(), 'admin'::server_role));

-- Create function to check custom role permissions
CREATE OR REPLACE FUNCTION public.has_permission(
  _server_id UUID,
  _user_id UUID,
  _permission role_permission
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_assignments ra
    JOIN public.custom_roles cr ON ra.custom_role_id = cr.id
    WHERE ra.server_id = _server_id
      AND ra.user_id = _user_id
      AND _permission = ANY(cr.permissions)
  )
$$;