-- Create direct message channels table
CREATE TABLE public.dm_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create DM channel participants (for 1-on-1 DMs)
CREATE TABLE public.dm_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_channel_id UUID REFERENCES public.dm_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dm_channel_id, user_id)
);

-- Create DM messages table
CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_channel_id UUID REFERENCES public.dm_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create message requests table
CREATE TABLE public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Create channel categories table
CREATE TABLE public.channel_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add category_id to channels table
ALTER TABLE public.channels ADD COLUMN category_id UUID REFERENCES public.channel_categories(id) ON DELETE SET NULL;

-- Update channel type to support voice
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_type_check;
ALTER TABLE public.channels ADD CONSTRAINT channels_type_check CHECK (type IN ('text', 'voice'));

-- RLS Policies for DM channels
ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their DM channels"
ON public.dm_channels FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dm_participants
  WHERE dm_participants.dm_channel_id = dm_channels.id
    AND dm_participants.user_id = auth.uid()
));

CREATE POLICY "Users can create DM channels"
ON public.dm_channels FOR INSERT
WITH CHECK (true);

-- RLS Policies for DM participants
ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DM participants"
ON public.dm_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dm_participants dp
  WHERE dp.dm_channel_id = dm_participants.dm_channel_id
    AND dp.user_id = auth.uid()
));

CREATE POLICY "Users can add DM participants"
ON public.dm_participants FOR INSERT
WITH CHECK (true);

-- RLS Policies for DM messages
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their DM messages"
ON public.dm_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dm_participants
  WHERE dm_participants.dm_channel_id = dm_messages.dm_channel_id
    AND dm_participants.user_id = auth.uid()
));

CREATE POLICY "Users can send DM messages"
ON public.dm_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own DM messages"
ON public.dm_messages FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for message requests
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their message requests"
ON public.message_requests FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create message requests"
ON public.message_requests FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update received message requests"
ON public.message_requests FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their message requests"
ON public.message_requests FOR DELETE
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS Policies for channel categories
ALTER TABLE public.channel_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by server members"
ON public.channel_categories FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.server_members
  WHERE server_members.server_id = channel_categories.server_id
    AND server_members.user_id = auth.uid()
));

CREATE POLICY "Server owners can manage categories"
ON public.channel_categories FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.servers
  WHERE servers.id = channel_categories.server_id
    AND servers.owner_id = auth.uid()
));