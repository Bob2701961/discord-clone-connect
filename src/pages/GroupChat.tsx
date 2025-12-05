import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Users } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface GroupMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: Profile;
}

const GroupChat = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) {
      navigate("/");
      return;
    }
    init();
  }, [channelId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);
    await fetchParticipants();
    await fetchMessages();
    setupRealtime();
    setLoading(false);
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("dm_participants")
      .select(`
        user_id,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("dm_channel_id", channelId);

    if (!error && data) {
      setParticipants(data.map((p: any) => p.profiles));
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("dm_messages")
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("dm_channel_id", channelId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as any);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel(`group_messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_messages',
          filter: `dm_channel_id=eq.${channelId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from("dm_messages")
      .insert([{
        dm_channel_id: channelId,
        user_id: currentUserId,
        content: newMessage,
      }]);

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-discord-chat h-screen">
      <div className="h-12 px-4 flex items-center gap-3 border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Group Chat</p>
          <p className="text-xs text-muted-foreground">
            {participants.length} members
          </p>
        </div>
        <div className="ml-auto flex -space-x-2">
          {participants.slice(0, 5).map(p => (
            <Avatar key={p.id} className="w-6 h-6 border-2 border-background">
              <AvatarImage src={p.avatar_url || ""} />
              <AvatarFallback className="text-xs">
                {(p.display_name || p.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {participants.length > 5 && (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
              +{participants.length - 5}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={message.profiles.avatar_url || undefined} />
                <AvatarFallback>
                  {(message.profiles.display_name || message.profiles.username)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">
                    {message.profiles.display_name || message.profiles.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-foreground mt-1">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={sendMessage} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
