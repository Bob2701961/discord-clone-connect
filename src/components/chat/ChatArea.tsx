import { useState, useEffect, useRef } from "react";
import { Hash, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Channel {
  id: string;
  name: string;
}

interface ChatAreaProps {
  channelId: string | null;
}

const ChatArea = ({ channelId }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchMessages();
      subscribeToMessages();
    }

    return () => {
      supabase.channel("messages").unsubscribe();
    };
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          // Fetch the new message with profile data
          const { data, error } = await supabase
            .from("messages")
            .select(`
              id,
              content,
              created_at,
              profiles:user_id (
                username,
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !channelId) return;

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        channel_id: channelId,
        user_id: user.id,
        content: messageInput.trim(),
      });

      if (error) throw error;

      setMessageInput("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-chat">
        <p className="text-muted-foreground">Select a channel to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-discord-chat">
      {/* Channel header */}
      <div className="h-12 px-4 flex items-center border-b border-border shadow-sm">
        <Hash className="w-5 h-5 mr-2 text-muted-foreground" />
        <span className="font-semibold">{channel?.name}</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary-foreground">
                  {message.profiles.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline space-x-2">
                  <span className="font-semibold">{message.profiles.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="p-4">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <Input
            placeholder={`Message #${channel?.name || "channel"}`}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={sending}
            className="flex-1 bg-secondary"
          />
          <Button type="submit" size="icon" disabled={sending || !messageInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
