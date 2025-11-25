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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface CreateServerDialogProps {
  onServerCreated: (serverId: string) => void;
}

const CreateServerDialog = ({ onServerCreated }: CreateServerDialogProps) => {
  const [serverName, setServerName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedName = serverName.trim();
      if (!trimmedName) {
        toast.error("Please enter a server name");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create server
      const { data: server, error: serverError } = await supabase
        .from("servers")
        .insert({
          name: trimmedName,
          owner_id: user.id,
        })
        .select()
        .single();

      if (serverError) throw serverError;

      // Join server as member
      const { error: memberError } = await supabase
        .from("server_members")
        .insert({
          server_id: server.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      // Create default general channel
      const { error: channelError } = await supabase
        .from("channels")
        .insert({
          server_id: server.id,
          name: "general",
          type: "text",
          position: 0,
        });

      if (channelError) throw channelError;

      toast.success(`Server "${trimmedName}" created!`);
      setServerName("");
      setIsOpen(false);
      onServerCreated(server.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create server");
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
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a server</DialogTitle>
          <DialogDescription>
            Give your new server a name to get started
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateServer} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverName">Server Name</Label>
            <Input
              id="serverName"
              placeholder="My Awesome Server"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">
              {serverName.length}/100 characters
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Server"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateServerDialog;
