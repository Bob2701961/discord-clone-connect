-- Create profiles table for user information
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  status text DEFAULT 'online',
  created_at timestamptz DEFAULT now()
);

-- Create servers table
CREATE TABLE public.servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_url text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create channels table
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'text',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create server_members table
CREATE TABLE public.server_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(server_id, user_id)
);

-- Create friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for servers
CREATE POLICY "Servers viewable by members" ON public.servers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.server_members 
    WHERE server_members.server_id = servers.id 
    AND server_members.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create servers" ON public.servers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update servers" ON public.servers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete servers" ON public.servers FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for channels
CREATE POLICY "Channels viewable by server members" ON public.channels FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.server_members 
    WHERE server_members.server_id = channels.server_id 
    AND server_members.user_id = auth.uid()
  )
);
CREATE POLICY "Server owners can manage channels" ON public.channels FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.servers 
    WHERE servers.id = channels.server_id 
    AND servers.owner_id = auth.uid()
  )
);

-- RLS Policies for messages
CREATE POLICY "Messages viewable by channel members" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    JOIN public.server_members ON server_members.server_id = channels.server_id
    WHERE channels.id = messages.channel_id 
    AND server_members.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for server_members
CREATE POLICY "Server members viewable by members" ON public.server_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = server_members.server_id 
    AND sm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can join servers" ON public.server_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave servers" ON public.server_members FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for friendships
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
CREATE POLICY "Users can create friendships" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friendships" ON public.friendships FOR UPDATE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
CREATE POLICY "Users can delete friendships" ON public.friendships FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();