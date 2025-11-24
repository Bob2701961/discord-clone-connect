import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface MessageContentProps {
  content: string;
  currentUserId?: string;
}

interface MentionProfile {
  username: string;
  display_name: string | null;
}

const MessageContent = ({ content, currentUserId }: MessageContentProps) => {
  const [profiles, setProfiles] = useState<Record<string, MentionProfile>>({});

  useEffect(() => {
    // Extract mentioned usernames from content
    const mentionPattern = /@(\w+)/g;
    const mentions = [...content.matchAll(mentionPattern)].map(match => match[1]);
    
    if (mentions.length > 0) {
      fetchMentionedProfiles(mentions);
    }
  }, [content]);

  const fetchMentionedProfiles = async (usernames: string[]) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("username", usernames);

    if (data) {
      const profileMap: Record<string, MentionProfile> = {};
      data.forEach((profile) => {
        profileMap[profile.username] = {
          username: profile.username,
          display_name: profile.display_name,
        };
      });
      setProfiles(profileMap);
    }
  };

  const renderContent = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionPattern = /@(\w+)/g;
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      const [fullMatch, username] = match;
      const startIndex = match.index;

      // Add text before mention
      if (startIndex > lastIndex) {
        parts.push(content.slice(lastIndex, startIndex));
      }

      // Add mention
      const profile = profiles[username];
      const isMentioningCurrentUser = profile && currentUserId;
      
      parts.push(
        <span
          key={startIndex}
          className={`font-semibold px-1 rounded ${
            isMentioningCurrentUser
              ? "bg-primary/20 text-primary"
              : "bg-accent text-accent-foreground"
          }`}
        >
          @{profile?.display_name || username}
        </span>
      );

      lastIndex = startIndex + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return <span>{renderContent()}</span>;
};

export default MessageContent;
