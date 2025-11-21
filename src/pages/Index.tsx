import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ServerSidebar from "@/components/layout/ServerSidebar";
import ChannelSidebar from "@/components/layout/ChannelSidebar";
import ChatArea from "@/components/chat/ChatArea";

const Index = () => {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="h-screen flex overflow-hidden">
      <ServerSidebar
        selectedServerId={selectedServerId}
        onServerSelect={(id) => {
          setSelectedServerId(id);
          setSelectedChannelId(null);
        }}
      />
      <ChannelSidebar
        serverId={selectedServerId}
        selectedChannelId={selectedChannelId}
        onChannelSelect={setSelectedChannelId}
      />
      <ChatArea channelId={selectedChannelId} />
    </div>
  );
};

export default Index;
