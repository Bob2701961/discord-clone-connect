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
import { Share2, Copy, Check } from "lucide-react";

interface ShareServerDialogProps {
  serverId: string;
  serverName: string;
}

const ShareServerDialog = ({ serverId, serverName }: ShareServerDialogProps) => {
  const [inviteCode, setInviteCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && serverId) {
      fetchInviteCode();
    }
  }, [isOpen, serverId]);

  const fetchInviteCode = async () => {
    try {
      const { data, error } = await supabase
        .from("servers")
        .select("invite_code")
        .eq("id", serverId)
        .single();

      if (error) throw error;
      setInviteCode(data.invite_code || "");
    } catch (error: any) {
      toast.error("Failed to load invite code");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {serverName}</DialogTitle>
          <DialogDescription>
            Share this invite code with others to let them join your server
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 p-4 bg-muted rounded-lg">
              <p className="text-2xl font-mono font-bold tracking-wider text-center">
                {inviteCode || "Loading..."}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              disabled={!inviteCode}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            This code never expires and can be used by anyone
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareServerDialog;
