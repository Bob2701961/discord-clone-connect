import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  channelId: string;
  placeholder?: string;
}

const MentionInput = ({
  value,
  onChange,
  onSubmit,
  channelId,
  placeholder = "Type a message...",
}: MentionInputProps) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionOptions, setMentionOptions] = useState<Profile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (channelId) {
      fetchChannelMembers();
    }
  }, [channelId]);

  useEffect(() => {
    const lastAtIndex = value.lastIndexOf("@", cursorPosition);
    if (lastAtIndex !== -1 && cursorPosition > lastAtIndex) {
      const searchText = value.slice(lastAtIndex + 1, cursorPosition);
      const hasSpace = searchText.includes(" ");
      
      if (!hasSpace) {
        setMentionSearch(searchText);
        setShowMentions(true);
        setSelectedIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [value, cursorPosition]);

  const fetchChannelMembers = async () => {
    // Get channel to find server_id
    const { data: channel } = await supabase
      .from("channels")
      .select("server_id")
      .eq("id", channelId)
      .single();

    if (!channel) return;

    // Get server members with profiles
    const { data, error } = await supabase
      .from("server_members")
      .select(`
        user_id,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("server_id", channel.server_id);

    if (!error && data) {
      const profiles = data.map((m: any) => m.profiles).filter(Boolean);
      setMentionOptions(profiles);
    }
  };

  const filteredMentions = mentionOptions.filter(
    (profile) =>
      profile.username.toLowerCase().includes(mentionSearch.toLowerCase()) ||
      profile.display_name?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const insertMention = (profile: Profile) => {
    const lastAtIndex = value.lastIndexOf("@", cursorPosition);
    const before = value.slice(0, lastAtIndex);
    const after = value.slice(cursorPosition);
    const newValue = `${before}@${profile.username} ${after}`;
    onChange(newValue);
    setShowMentions(false);
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredMentions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredMentions.length - 1
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(e: any) => setCursorPosition(e.target.selectionStart)}
        placeholder={placeholder}
        className="min-h-[44px] max-h-[200px] resize-none pr-12"
        rows={1}
      />
      
      {showMentions && filteredMentions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg">
          <ScrollArea className="max-h-[200px]">
            {filteredMentions.map((profile, index) => (
              <button
                key={profile.id}
                onClick={() => insertMention(profile)}
                className={`w-full flex items-center gap-2 p-2 hover:bg-accent ${
                  index === selectedIndex ? "bg-accent" : ""
                }`}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-xs">
                    {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default MentionInput;
