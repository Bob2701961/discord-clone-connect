CREATE TABLE public.channel_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_send_messages BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_channel_role UNIQUE(channel_id, role_id)
);

ALTER TABLE public.channel_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;