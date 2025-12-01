import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, Hash } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MentionInput from "./MentionInput";
import MessageContent from "./MessageContent";
import VoiceChat from "./VoiceChat";

interface Message {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Channel {
  id: string;
  name: string;
  type: string | null;
}

interface ChatAreaProps {
  channelId: string | null;
}

const ChatArea = ({ channelId }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchMessages();
      subscribeToMessages();
    }
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const fetchChannel = async () => {
    if (!channelId) return;

    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("id", channelId)
      .single();

    if (error) {
      toast.error("Failed to load channel");
      return;
    }

    setChannel(data);
  };

  const fetchMessages = async () => {
    if (!channelId) return;

    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load messages");
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    if (!channelId) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data, error } = await supabase
            .from("messages")
            .select(`
              id,
              content,
              created_at,
              profiles:user_id (
                username,
                display_name,
                avatar_url
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (!error && data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channelId) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const trimmedMessage = newMessage.trim();
      if (trimmedMessage.length > 2000) {
        toast.error("Message must be less than 2000 characters");
        setLoading(false);
        return;
      }

      // Insert message
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: trimmedMessage,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Extract mentions and create mention records
      const mentionPattern = /@(\w+)/g;
      const mentions = [...trimmedMessage.matchAll(mentionPattern)].map(match => match[1]);
      
      if (mentions.length > 0 && messageData) {
        // Get user IDs for mentioned usernames
        const { data: mentionedProfiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("username", mentions);

        if (mentionedProfiles && mentionedProfiles.length > 0) {
          const mentionInserts = mentionedProfiles.map(profile => ({
            message_id: messageData.id,
            mentioned_user_id: profile.id,
          }));

          await supabase.from("message_mentions").insert(mentionInserts);
        }
      }

      setNewMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-chat">
        <p className="text-muted-foreground">Select a channel to start chatting</p>
      </div>
    );
  }

  // Show voice chat interface for voice channels
  if (channel?.type === "voice") {
    return <VoiceChat channelId={channelId} channelName={channel.name} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-discord-chat">
      <div className="h-12 px-4 flex items-center border-b border-border shadow-sm">
        <Hash className="w-5 h-5 mr-2 text-muted-foreground" />
        <span className="font-semibold">{channel?.name}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={message.profiles.avatar_url || ""} />
                <AvatarFallback>
                  {(message.profiles.display_name || message.profiles.username)
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-baseline space-x-2">
                  <span className="font-semibold">
                    {message.profiles.display_name || message.profiles.username}
                  </span>
                  {message.profiles.display_name && (
                    <span className="text-xs text-muted-foreground">
                      @{message.profiles.username}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm break-words whitespace-pre-wrap">
                  <MessageContent 
                    content={message.content} 
                    currentUserId={currentUserId || undefined}
                  />
                </p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <div className="flex-1">
            <MentionInput
              value={newMessage}
              onChange={setNewMessage}
              onSubmit={sendMessage}
              channelId={channelId}
              placeholder="Type a message... (use @ to mention)"
            />
          </div>
          <Button type="submit" size="icon" disabled={loading || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
