import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface JoinServerDialogProps {
  onServerJoined: (serverId: string) => void;
}

const JoinServerDialog = ({ onServerJoined }: JoinServerDialogProps) => {
  const [inviteCode, setInviteCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedCode = inviteCode.trim().toUpperCase();
      if (!trimmedCode) {
        toast.error("Please enter an invite code");
        setLoading(false);
        return;
      }

      // Find server by invite code
      const { data: server, error: serverError } = await supabase
        .from("servers")
        .select("id, name")
        .eq("invite_code", trimmedCode)
        .maybeSingle();

      if (serverError) throw serverError;

      if (!server) {
        toast.error("Invalid invite code");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("server_members")
        .select("id")
        .eq("server_id", server.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        toast.info(`You're already a member of ${server.name}`);
        setIsOpen(false);
        setInviteCode("");
        onServerJoined(server.id);
        setLoading(false);
        return;
      }

      // Join server
      const { error: joinError } = await supabase
        .from("server_members")
        .insert({ server_id: server.id, user_id: user.id });

      if (joinError) throw joinError;

      toast.success(`Joined ${server.name}!`);
      setIsOpen(false);
      setInviteCode("");
      onServerJoined(server.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to join server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-2xl hover:rounded-xl transition-all bg-background hover:bg-accent hover:text-accent-foreground"
        >
          <UserPlus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a server</DialogTitle>
          <DialogDescription>
            Enter an invite code to join an existing server
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoinServer} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Code</Label>
            <Input
              id="inviteCode"
              placeholder="ABCD1234"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              required
              className="font-mono text-lg tracking-wider"
            />
            <p className="text-xs text-muted-foreground">
              8-character invite code from server owner
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Joining..." : "Join Server"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinServerDialog;
