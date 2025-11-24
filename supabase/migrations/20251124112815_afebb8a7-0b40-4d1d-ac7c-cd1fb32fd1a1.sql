-- Create enum for server roles
CREATE TYPE public.server_role AS ENUM ('owner', 'admin', 'moderator', 'member');

-- Create server_roles table (separate from profiles for security)
CREATE TABLE public.server_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role server_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(server_id, user_id)
);

-- Enable RLS on server_roles
ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check server roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_server_role(_server_id UUID, _user_id UUID, _role server_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.server_roles
    WHERE server_id = _server_id
      AND user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has at least a certain role level
CREATE OR REPLACE FUNCTION public.has_server_role_level(_server_id UUID, _user_id UUID, _min_role server_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.server_roles
    WHERE server_id = _server_id
      AND user_id = _user_id
      AND (
        CASE _min_role
          WHEN 'member' THEN role IN ('member', 'moderator', 'admin', 'owner')
          WHEN 'moderator' THEN role IN ('moderator', 'admin', 'owner')
          WHEN 'admin' THEN role IN ('admin', 'owner')
          WHEN 'owner' THEN role = 'owner'
        END
      )
  )
$$;

-- RLS policies for server_roles
CREATE POLICY "Server members can view roles"
ON public.server_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_roles.server_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage roles"
ON public.server_roles
FOR ALL
TO authenticated
USING (
  has_server_role_level(server_id, auth.uid(), 'admin')
);

-- Create message_mentions table for pinging
CREATE TABLE public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read BOOLEAN DEFAULT false,
  UNIQUE(message_id, mentioned_user_id)
);

-- Enable RLS on message_mentions
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_mentions
CREATE POLICY "Users can view their mentions"
ON public.message_mentions
FOR SELECT
TO authenticated
USING (mentioned_user_id = auth.uid());

CREATE POLICY "Message authors can create mentions"
ON public.message_mentions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.id = message_id
    AND messages.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own mention read status"
ON public.message_mentions
FOR UPDATE
TO authenticated
USING (mentioned_user_id = auth.uid());

-- Trigger to automatically assign owner role when creating a server
CREATE OR REPLACE FUNCTION public.assign_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.server_roles (server_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_server_created
  AFTER INSERT ON public.servers
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_owner_role();

-- Trigger to assign member role when joining a server
CREATE OR REPLACE FUNCTION public.assign_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.server_roles (server_id, user_id, role)
  VALUES (NEW.server_id, NEW.user_id, 'member')
  ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_server_joined
  AFTER INSERT ON public.server_members
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_member_role();

-- Add roles to existing servers
INSERT INTO public.server_roles (server_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.servers
ON CONFLICT (server_id, user_id) DO NOTHING;

-- Add member roles to existing members
INSERT INTO public.server_roles (server_id, user_id, role)
SELECT server_id, user_id, 'member'
FROM public.server_members
ON CONFLICT (server_id, user_id) DO NOTHING;