import { useState, useEffect } from "react";
import { Hash, Plus, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ShareServerDialog from "@/components/dialogs/ShareServerDialog";
import ProfileSettingsDialog from "@/components/profile/ProfileSettingsDialog";
import FriendsList from "@/components/friends/FriendsList";
import DisplayNameWarningBanner from "@/components/profile/DisplayNameWarningBanner";
import ServerSettingsDialog from "@/components/server/ServerSettingsDialog";
import CategorySection from "@/components/channel/CategorySection";
import MessageRequestsDialog from "@/components/dm/MessageRequestsDialog";
import ServerManagementDialog from "@/components/server/ServerManagementDialog";

interface Channel {
  id: string;
  name: string;
  type: string;
  position: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  position: number;
}

interface Server {
  id: string;
  name: string;
  owner_id: string;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
}

interface ChannelSidebarProps {
  serverId: string | null;
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}

const ChannelSidebar = ({ serverId, selectedChannelId, onChannelSelect }: ChannelSidebarProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [server, setServer] = useState<Server | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"text" | "voice">("text");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (serverId && serverId !== "@me") {
      fetchServerAndChannels();
      fetchCategories();
      fetchUserRole();
    }
  }, [serverId]);

  const fetchUserRole = async () => {
    if (!serverId || serverId === "@me") return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("server_roles")
      .select("role")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  const fetchCategories = async () => {
    if (!serverId || serverId === "@me") return;

    const { data, error } = await supabase
      .from("channel_categories")
      .select("*")
      .eq("server_id", serverId)
      .order("position", { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchServerAndChannels = async () => {
    if (!serverId || serverId === "@me") return;

    // Fetch server
    const { data: serverData, error: serverError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", serverId)
      .single();

    if (serverError) {
      toast.error("Failed to load server");
      return;
    }

    setServer(serverData);

    // Fetch channels
    const { data: channelsData, error: channelsError } = await supabase
      .from("channels")
      .select("*")
      .eq("server_id", serverId)
      .order("position");

    if (channelsError) {
      toast.error("Failed to load channels");
      return;
    }

    setChannels(channelsData || []);

    // Auto-select first channel if none selected
    if (channelsData && channelsData.length > 0 && !selectedChannelId) {
      onChannelSelect(channelsData[0].id);
    }
  };

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverId || serverId === "@me") return;
    setLoading(true);

    try {
      // Validate channel name
      const trimmedName = channelName.trim();
      if (!trimmedName) {
        toast.error("Channel name cannot be empty");
        setLoading(false);
        return;
      }
      if (trimmedName.length > 100) {
        toast.error("Channel name must be less than 100 characters");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("channels")
        .insert({
          server_id: serverId,
          name: trimmedName,
          type: channelType,
          position: channels.length,
        });

      if (error) throw error;

      toast.success("Channel created!");
      setChannelName("");
      setChannelType("text");
      setIsDialogOpen(false);
      fetchServerAndChannels();
    } catch (error: any) {
      toast.error(error.message || "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logged out successfully");
  };

  if (serverId === "@me") {
    return (
      <div className="w-60 bg-discord-channel flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b border-border shadow-sm">
          <span className="font-semibold">Direct Messages</span>
          <MessageRequestsDialog />
        </div>
        <DisplayNameWarningBanner />
        <div className="flex-1 overflow-y-auto">
          <FriendsList />
        </div>
        {profile && (
          <div className="h-[52px] px-2 flex items-center justify-between bg-discord-server">
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback>
                  {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">
                  {profile.display_name || profile.username}
                </p>
                {profile.display_name && (
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ProfileSettingsDialog />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-60 bg-discord-channel flex flex-col">
      <div className="h-12 px-4 flex items-center justify-between border-b border-border shadow-sm">
        <span className="font-semibold">{server?.name}</span>
        <div className="flex items-center gap-1">
          {server && <ShareServerDialog serverId={server.id} serverName={server.name} />}
          {server && <ServerManagementDialog serverId={server.id} userRole={userRole} />}
          {server && (userRole === "owner" || userRole === "admin") && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setIsServerSettingsOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
              <ServerSettingsDialog
                open={isServerSettingsOpen}
                onOpenChange={setIsServerSettingsOpen}
                serverId={server.id}
                serverName={server.name}
                serverIcon={null}
                userRole={userRole}
                onServerUpdate={fetchServerAndChannels}
              />
            </>
          )}
        </div>
      </div>
      <DisplayNameWarningBanner />

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Text Channels
            </span>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4">
                  <Plus className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                  <DialogDescription>
                    Add a new channel to {server?.name}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createChannel} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Channel Type</Label>
                    <RadioGroup value={channelType} onValueChange={(v: any) => setChannelType(v)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="text" id="text" />
                        <Label htmlFor="text">Text Channel</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="voice" id="voice" />
                        <Label htmlFor="voice">Voice Channel</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channelName">Channel Name</Label>
                    <Input
                      id="channelName"
                      placeholder={channelType === "text" ? "general" : "voice-chat"}
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      maxLength={100}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {channelName.length}/100 characters
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating..." : "Create Channel"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {categories.map((category) => {
            const categoryChannels = channels.filter(ch => ch.category_id === category.id);
            if (categoryChannels.length === 0) return null;
            return (
              <CategorySection
                key={category.id}
                categoryName={category.name}
                channels={categoryChannels}
                selectedChannelId={selectedChannelId}
                onChannelClick={onChannelSelect}
              />
            );
          })}
          
          {channels.filter(ch => !ch.category_id).length > 0 && (
            <CategorySection
              categoryName="Channels"
              channels={channels.filter(ch => !ch.category_id)}
              selectedChannelId={selectedChannelId}
              onChannelClick={onChannelSelect}
            />
          )}
        </div>
      </div>

      {profile && (
        <div className="h-[52px] px-2 flex items-center justify-between bg-discord-server">
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">
                {profile.display_name || profile.username}
              </p>
              {profile.display_name && (
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ProfileSettingsDialog />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelSidebar;
