import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Check, X } from "lucide-react";

interface MessageRequest {
  id: string;
  from_user_id: string;
  status: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const MessageRequestsDialog = () => {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("message_requests")
      .select(`
        *,
        profiles:from_user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("to_user_id", user.id)
      .eq("status", "pending");

    if (!error && data) {
      setRequests(data as any);
    }
  };

  const handleRequest = async (requestId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("message_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to update request");
    } else {
      toast.success(status === "accepted" ? "Request accepted" : "Request rejected");
      fetchRequests();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Mail className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message Requests</DialogTitle>
          <DialogDescription>
            Review and manage incoming message requests
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={request.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                      {(request.profiles.display_name || request.profiles.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {request.profiles.display_name || request.profiles.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{request.profiles.username}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRequest(request.id, "accepted")}
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRequest(request.id, "rejected")}
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending message requests
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MessageRequestsDialog;
