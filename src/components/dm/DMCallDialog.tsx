import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DMCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendProfile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  dmChannelId: string;
  currentUserId: string;
  isIncoming?: boolean;
}

const DMCallDialog = ({ open, onOpenChange, friendProfile, dmChannelId, currentUserId, isIncoming }: DMCallDialogProps) => {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const callStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      initializeCall();
    }
    return () => {
      endCall();
    };
  }, [open]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected' && callStartRef.current) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartRef.current!) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const channel = supabase.channel(`dm-call:${dmChannelId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
          if (payload.to === currentUserId) {
            await handleOffer(payload.offer, payload.from);
          }
        })
        .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
          if (payload.to === currentUserId && peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            setCallStatus('connected');
            callStartRef.current = Date.now();
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.to === currentUserId && peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        })
        .on('broadcast', { event: 'call-end' }, ({ payload }) => {
          if (payload.to === currentUserId) {
            setCallStatus('ended');
            toast.info("Call ended");
            setTimeout(() => onOpenChange(false), 1000);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && !isIncoming) {
            await makeOffer();
          }
        });

    } catch (error) {
      toast.error("Failed to access microphone");
      onOpenChange(false);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play().catch(console.error);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: currentUserId,
            to: friendProfile.id,
            candidate: event.candidate,
          }
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const makeOffer = async () => {
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'call-offer',
      payload: {
        from: currentUserId,
        to: friendProfile.id,
        offer: offer,
      }
    });
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'call-answer',
      payload: {
        from: currentUserId,
        to: from,
        answer: answer,
      }
    });

    setCallStatus('connected');
    callStartRef.current = Date.now();
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnectionRef.current?.close();
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-end',
        payload: {
          from: currentUserId,
          to: friendProfile.id,
        }
      });
      channelRef.current.unsubscribe();
    }

    setCallStatus('ended');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) endCall(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {callStatus === 'calling' ? 'Calling...' : callStatus === 'connected' ? 'In Call' : 'Call Ended'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-8">
          <Avatar className="w-24 h-24">
            <AvatarImage src={friendProfile.avatar_url || ""} />
            <AvatarFallback className="text-2xl">
              {(friendProfile.display_name || friendProfile.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <p className="text-lg font-semibold">
              {friendProfile.display_name || friendProfile.username}
            </p>
            {callStatus === 'calling' && (
              <p className="text-muted-foreground animate-pulse">Ringing...</p>
            )}
            {callStatus === 'connected' && (
              <p className="text-green-500">{formatDuration(callDuration)}</p>
            )}
          </div>

          <div className="flex gap-4">
            {callStatus === 'connected' && (
              <>
                <Button
                  variant={muted ? "destructive" : "secondary"}
                  size="icon"
                  className="w-14 h-14 rounded-full"
                  onClick={toggleMute}
                >
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                <Button
                  variant={deafened ? "destructive" : "secondary"}
                  size="icon"
                  className="w-14 h-14 rounded-full"
                  onClick={() => setDeafened(!deafened)}
                >
                  {deafened ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => { endCall(); onOpenChange(false); }}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DMCallDialog;
