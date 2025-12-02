import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Mic, MicOff, PhoneOff, MonitorUp } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VoiceUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  muted: boolean;
}

interface VoiceChatProps {
  channelId: string;
  channelName: string;
}

const VoiceChat = ({ channelId, channelName }: VoiceChatProps) => {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchCurrentUser();
    return () => {
      disconnect();
    };
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const connect = async () => {
    if (!currentUser?.id) {
      toast.error("Please wait, loading user data...");
      return;
    }
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      localStreamRef.current = stream;

      // Join voice channel using Supabase Realtime
      const voiceChannel = supabase.channel(`voice:${channelId}`, {
        config: { presence: { key: currentUser.id } }
      });

      channelRef.current = voiceChannel;

      voiceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = voiceChannel.presenceState();
          console.log('Presence state synced:', state);
          const users: VoiceUser[] = [];
          
          Object.keys(state).forEach(userId => {
            const presences = state[userId] as any[];
            if (presences && presences.length > 0) {
              const presence = presences[0];
              // Supabase presence data is the payload we sent in track()
              if (presence && presence.id) {
                users.push(presence as VoiceUser);
              }
            }
          });
          
          console.log('Parsed users:', users);
          console.log('Current user ID:', currentUser?.id);
          setVoiceUsers(users.filter(u => u.id !== currentUser?.id));
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('User joined:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left:', leftPresences);
          // Clean up peer connections for users who left
          leftPresences.forEach((presence: any) => {
            const pc = peerConnectionsRef.current.get(presence.id);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(presence.id);
            }
          });
        })
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          await handleOffer(payload);
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          await handleAnswer(payload);
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          await handleIceCandidate(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await voiceChannel.track({
              id: currentUser.id,
              username: currentUser.username,
              display_name: currentUser.display_name,
              avatar_url: currentUser.avatar_url,
              muted: false,
            });
            setConnected(true);
            toast.success("Connected to voice channel");
          }
        });

    } catch (error: any) {
      toast.error("Failed to connect: " + error.message);
    }
  };

  const disconnect = () => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Unsubscribe from channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setConnected(false);
    setVoiceUsers([]);
    toast.info("Disconnected from voice channel");
  };

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    
    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      playRemoteAudio(userId, remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: currentUser?.id,
            to: userId,
            candidate: event.candidate,
          }
        });
      }
    };

    peerConnectionsRef.current.set(userId, pc);
    return pc;
  };

  const handleOffer = async (payload: any) => {
    if (payload.to !== currentUser?.id) return;

    const pc = createPeerConnection(payload.from);
    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          from: currentUser?.id,
          to: payload.from,
          answer: answer,
        }
      });
    }
  };

  const handleAnswer = async (payload: any) => {
    if (payload.to !== currentUser?.id) return;

    const pc = peerConnectionsRef.current.get(payload.from);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    }
  };

  const handleIceCandidate = async (payload: any) => {
    if (payload.to !== currentUser?.id) return;

    const pc = peerConnectionsRef.current.get(payload.from);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  };

  const playRemoteAudio = (userId: string, stream: MediaStream) => {
    const audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
    if (audioElement) {
      audioElement.srcObject = stream;
      audioElement.play().catch(e => console.error('Error playing audio:', e));
    }
  };

  const initiateCallToUser = async (userId: string) => {
    const pc = createPeerConnection(userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          from: currentUser?.id,
          to: userId,
          offer: offer,
        }
      });
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
      
      // Update presence
      if (channelRef.current && currentUser) {
        channelRef.current.track({
          id: currentUser.id,
          username: currentUser.username,
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url,
          muted: !audioTrack.enabled,
        });
      }
    }
  };

  const toggleDeafen = () => {
    setDeafened(!deafened);
    // Mute all remote audio elements
    voiceUsers.forEach(user => {
      const audioElement = document.getElementById(`audio-${user.id}`) as HTMLAudioElement;
      if (audioElement) {
        audioElement.muted = !deafened;
      }
    });
  };

  const toggleScreenShare = async () => {
    if (!connected) {
      toast.error("Connect to voice channel first");
      return;
    }

    if (screenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setScreenSharing(false);
      toast.info("Screen sharing stopped");
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        screenStreamRef.current = stream;
        
        // Add screen share track to all peer connections
        const screenTrack = stream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, stream);
          }
        });

        // Handle screen share stop
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setScreenSharing(true);
        toast.success("Screen sharing started");
      } catch (error) {
        toast.error("Failed to start screen sharing");
      }
    }
  };

  // Initiate calls to all users when we join
  useEffect(() => {
    if (connected && voiceUsers.length > 0) {
      voiceUsers.forEach(user => {
        if (!peerConnectionsRef.current.has(user.id)) {
          initiateCallToUser(user.id);
        }
      });
    }
  }, [voiceUsers, connected]);

  return (
    <div className="flex-1 flex flex-col bg-discord-chat">
      <div className="h-12 px-4 flex items-center border-b border-border shadow-sm">
        <Volume2 className="w-5 h-5 mr-2 text-muted-foreground" />
        <span className="font-semibold">{channelName}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8">
          <div className="text-center mb-8">
            <Volume2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">{channelName}</h2>
            {!connected ? (
              <p className="text-muted-foreground mb-4">
                Click to join the voice channel
              </p>
            ) : (
              <p className="text-muted-foreground mb-4">
                {voiceUsers.length} {voiceUsers.length === 1 ? 'user' : 'users'} in channel
              </p>
            )}
          </div>

          {connected && voiceUsers.length > 0 && (
            <div className="space-y-3 max-w-md mx-auto">
              {voiceUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>
                      {(user.display_name || user.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {user.display_name || user.username}
                    </div>
                    {user.display_name && (
                      <div className="text-xs text-muted-foreground">
                        @{user.username}
                      </div>
                    )}
                  </div>
                  {user.muted && <MicOff className="w-4 h-4 text-destructive" />}
                  <audio id={`audio-${user.id}`} autoPlay />
                </div>
              ))}
            </div>
          )}

          {connected && voiceUsers.length === 0 && (
            <div className="text-center text-muted-foreground">
              You're the only one here. Waiting for others to join...
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2 justify-center">
          {!connected ? (
            <Button onClick={connect} size="lg" className="gap-2">
              <Volume2 className="w-5 h-5" />
              Join Voice Channel
            </Button>
          ) : (
            <>
              <Button
                variant={muted ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleMute}
                className="w-12 h-12"
              >
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant={deafened ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleDeafen}
                className="w-12 h-12"
              >
                {deafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Button
                variant={screenSharing ? "default" : "secondary"}
                size="icon"
                onClick={toggleScreenShare}
                className="w-12 h-12"
              >
                <MonitorUp className="w-5 h-5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={disconnect}
                className="w-12 h-12"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;