import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DirectMessagesArea from "@/components/dm/DirectMessagesArea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

const DirectMessage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [dmChannelId, setDmChannelId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, [friendId]);

  const init = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !friendId) {
        navigate("/");
        return;
      }

      setCurrentUserId(user.id);
      
      const profileSuccess = await fetchFriendProfile();
      if (!profileSuccess) {
        setLoading(false);
        return;
      }
      
      await getOrCreateDmChannel(user.id);
    } catch (error) {
      console.error("Error initializing DM:", error);
      toast.error("Failed to load conversation");
      setLoading(false);
    }
  };

  const fetchFriendProfile = async (): Promise<boolean> => {
    if (!friendId) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", friendId)
      .single();

    if (error) {
      toast.error("Failed to load friend profile");
      return false;
    }

    setFriendProfile(data);
    return true;
  };

  const getOrCreateDmChannel = async (userId: string) => {
    if (!friendId) return;

    // Check if DM channel already exists
    const { data: existingChannels } = await supabase
      .from("dm_participants")
      .select("dm_channel_id")
      .eq("user_id", userId);

    if (existingChannels) {
      for (const channel of existingChannels) {
        const { data: otherParticipant } = await supabase
          .from("dm_participants")
          .select("user_id")
          .eq("dm_channel_id", channel.dm_channel_id)
          .neq("user_id", userId)
          .single();

        if (otherParticipant && otherParticipant.user_id === friendId) {
          setDmChannelId(channel.dm_channel_id);
          setLoading(false);
          return;
        }
      }
    }

    // Create new DM channel
    console.log("Attempting to create DM channel...");
    
    const { data: newChannel, error: channelError } = await supabase
      .from("dm_channels")
      .insert([{}])
      .select("id")
      .single();

    console.log("Create DM channel result:", { newChannel, channelError });

    if (channelError) {
      console.error("DM channel creation error details:", channelError);
      toast.error(`Failed to create DM channel: ${channelError.message}`);
      setLoading(false);
      return;
    }

    // Add participants
    const { error: participantsError } = await supabase
      .from("dm_participants")
      .insert([
        { dm_channel_id: newChannel.id, user_id: userId },
        { dm_channel_id: newChannel.id, user_id: friendId },
      ]);

    if (participantsError) {
      console.error("Add participants error:", participantsError);
      toast.error("Failed to add participants");
      setLoading(false);
      return;
    }

    setDmChannelId(newChannel.id);
    setLoading(false);
  };

  if (loading || !dmChannelId || !friendProfile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-discord-chat">
      <div className="h-12 px-4 flex items-center gap-3 border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarImage src={friendProfile.avatar_url || ""} />
          <AvatarFallback>
            {(friendProfile.display_name || friendProfile.username).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">
            {friendProfile.display_name || friendProfile.username}
          </p>
          {friendProfile.display_name && (
            <p className="text-xs text-muted-foreground">
              @{friendProfile.username}
            </p>
          )}
        </div>
      </div>
      <DirectMessagesArea dmChannelId={dmChannelId} currentUserId={currentUserId} />
    </div>
  );
};

export default DirectMessage;