import { useState, useEffect } from "react";
import { Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
}

interface ServerSidebarProps {
  selectedServerId: string | null;
  onServerSelect: (serverId: string) => void;
}

const ServerSidebar = ({ selectedServerId, onServerSelect }: ServerSidebarProps) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [serverName, setServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    const { data, error } = await supabase
      .from("servers")
      .select(`
        id,
        name,
        icon_url,
        server_members!inner(user_id)
      `)
      .order("name");

    if (error) {
      toast.error("Failed to load servers");
      return;
    }

    setServers(data || []);
    
    // Auto-select first server if none selected
    if (data && data.length > 0 && !selectedServerId) {
      onServerSelect(data[0].id);
    }
  };

  const createServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate server name
      const trimmedName = serverName.trim();
      if (!trimmedName) {
        toast.error("Server name cannot be empty");
        setLoading(false);
        return;
      }
      if (trimmedName.length > 100) {
        toast.error("Server name must be less than 100 characters");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Ensure profile exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If profile doesn't exist, create it
      if (!profile) {
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username: user.email?.split("@")[0] || "user",
          });

        if (createProfileError) throw createProfileError;
      }

      // Create server
      const { data: server, error: serverError } = await supabase
        .from("servers")
        .insert({ name: trimmedName, owner_id: user.id })
        .select()
        .single();

      if (serverError) throw serverError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from("server_members")
        .insert({ server_id: server.id, user_id: user.id });

      if (memberError) throw memberError;

      // Create default general channel
      const { error: channelError } = await supabase
        .from("channels")
        .insert({ server_id: server.id, name: "general", position: 0 });

      if (channelError) throw channelError;

      toast.success("Server created!");
      setServerName("");
      setIsDialogOpen(false);
      fetchServers();
      onServerSelect(server.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create server");
    } finally {
      setLoading(false);
    }
  };

  const joinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedCode = inviteCode.trim().toUpperCase();
      if (!trimmedCode || trimmedCode.length !== 8) {
        toast.error("Please enter a valid 8-character invite code");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("server_members")
        .select("id")
        .eq("server_id", server.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        toast.info(`You're already a member of ${server.name}`);
        setIsDialogOpen(false);
        setInviteCode("");
        onServerSelect(server.id);
        setLoading(false);
        return;
      }

      // Join server
      const { error: joinError } = await supabase
        .from("server_members")
        .insert({ server_id: server.id, user_id: user.id });

      if (joinError) throw joinError;

      toast.success(`Joined ${server.name}!`);
      setInviteCode("");
      setIsDialogOpen(false);
      fetchServers();
      onServerSelect(server.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to join server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[72px] bg-discord-server flex flex-col items-center py-3 space-y-2">
      <Button
        variant="ghost"
        size="icon"
        className="w-12 h-12 rounded-2xl hover:rounded-xl transition-all bg-background hover:bg-primary hover:text-primary-foreground"
        onClick={() => onServerSelect("@me")}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      <div className="w-8 h-[2px] bg-border rounded-full" />

      {servers.map((server) => (
        <Button
          key={server.id}
          variant="ghost"
          size="icon"
          onClick={() => onServerSelect(server.id)}
          className={`w-12 h-12 rounded-2xl hover:rounded-xl transition-all ${
            selectedServerId === server.id
              ? "rounded-xl bg-primary text-primary-foreground"
              : "bg-background hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt={server.name} className="w-full h-full rounded-2xl" />
          ) : (
            <span className="font-semibold">{server.name.charAt(0).toUpperCase()}</span>
          )}
        </Button>
      ))}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            <DialogTitle>Add a Server</DialogTitle>
            <DialogDescription>
              Create a new server or join an existing one
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Server</TabsTrigger>
              <TabsTrigger value="join">Join Server</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              <form onSubmit={createServer} className="space-y-4">
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
            </TabsContent>

            <TabsContent value="join" className="space-y-4 mt-4">
              <form onSubmit={joinServer} className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerSidebar;
