import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface DirectMessagesAreaProps {
  dmChannelId: string;
  currentUserId: string;
}

interface DmMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const DirectMessagesArea = ({ dmChannelId, currentUserId }: DirectMessagesAreaProps) => {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchMessages();
    
    const channel = supabase
      .channel(`dm_messages:${dmChannelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_messages',
          filter: `dm_channel_id=eq.${dmChannelId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dmChannelId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("dm_messages")
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("dm_channel_id", dmChannelId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as any);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from("dm_messages")
      .insert([{
        dm_channel_id: dmChannelId,
        user_id: currentUserId,
        content: newMessage,
      }]);

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full">
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

export default DirectMessagesArea;
