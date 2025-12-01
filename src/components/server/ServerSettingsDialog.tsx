import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import CustomRolesDialog from "./CustomRolesDialog";
import ServerRolesDialog from "./ServerRolesDialog";
import ManageCategoriesDialog from "../channel/ManageCategoriesDialog";
import { Shield, Hash, Settings2, Trash2 } from "lucide-react";

interface ServerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  serverName: string;
  serverIcon: string | null;
  userRole: string;
  onServerUpdate: () => void;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  is_private: boolean;
}

interface Role {
  id: string;
  name: string;
  color: string;
}

interface ChannelPermission {
  channel_id: string;
  role_id: string;
  can_view: boolean;
  can_send_messages: boolean;
}

const ServerSettingsDialog = ({
  open,
  onOpenChange,
  serverId,
  serverName,
  serverIcon,
  userRole,
  onServerUpdate,
}: ServerSettingsDialogProps) => {
  const [name, setName] = useState(serverName);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<ChannelPermission[]>([]);

  useEffect(() => {
    if (open) {
      setName(serverName);
      fetchChannels();
      fetchRoles();
      fetchPermissions();
    }
  }, [open, serverName]);

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("server_id", serverId)
      .order("position");

    if (error) {
      toast.error("Failed to load channels");
      return;
    }

    setChannels(data || []);
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("custom_roles")
      .select("*")
      .eq("server_id", serverId)
      .order("position");

    if (error) {
      toast.error("Failed to load roles");
      return;
    }

    setRoles(data || []);
  };

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from("channel_permissions")
      .select("*")
      .in("channel_id", channels.map(c => c.id));

    if (!error && data) {
      setPermissions(data);
    }
  };

  const updateServerName = async () => {
    if (!name.trim()) {
      toast.error("Server name cannot be empty");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("servers")
      .update({ name: name.trim() })
      .eq("id", serverId);

    setLoading(false);

    if (error) {
      toast.error("Failed to update server name");
      return;
    }

    toast.success("Server name updated");
    onServerUpdate();
  };

  const toggleChannelPrivacy = async (channelId: string, isPrivate: boolean) => {
    const { error } = await supabase
      .from("channels")
      .update({ is_private: !isPrivate })
      .eq("id", channelId);

    if (error) {
      toast.error("Failed to update channel privacy");
      return;
    }

    toast.success(isPrivate ? "Channel is now public" : "Channel is now private");
    fetchChannels();
  };

  const toggleChannelPermission = async (
    channelId: string,
    roleId: string,
    permissionType: "can_view" | "can_send_messages",
    currentValue: boolean
  ) => {
    const existing = permissions.find(
      p => p.channel_id === channelId && p.role_id === roleId
    );

    if (existing) {
      const { error } = await supabase
        .from("channel_permissions")
        .update({ [permissionType]: !currentValue })
        .eq("channel_id", channelId)
        .eq("role_id", roleId);

      if (error) {
        toast.error("Failed to update permission");
        return;
      }
    } else {
      const { error } = await supabase
        .from("channel_permissions")
        .insert({
          channel_id: channelId,
          role_id: roleId,
          [permissionType]: true,
        });

      if (error) {
        toast.error("Failed to add permission");
        return;
      }
    }

    toast.success("Permission updated");
    fetchPermissions();
  };

  const getPermission = (channelId: string, roleId: string, type: "can_view" | "can_send_messages") => {
    const perm = permissions.find(
      p => p.channel_id === channelId && p.role_id === roleId
    );
    return perm ? perm[type] : false;
  };

  const deleteServer = async () => {
    if (!confirm("Are you sure you want to delete this server? This action cannot be undone.")) {
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("servers")
      .delete()
      .eq("id", serverId);

    setLoading(false);

    if (error) {
      toast.error("Failed to delete server");
      return;
    }

    toast.success("Server deleted");
    onOpenChange(false);
    window.location.href = "/";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Server Settings</DialogTitle>
          <DialogDescription>
            Manage your server settings, roles, and permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings2 className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="w-4 h-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="channels">
              <Hash className="w-4 h-4 mr-2" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="danger">
              <Trash2 className="w-4 h-4 mr-2" />
              Danger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-name">Server Name</Label>
              <div className="flex gap-2">
                <Input
                  id="server-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter server name"
                />
                <Button onClick={updateServerName} disabled={loading}>
                  Save
                </Button>
              </div>
            </div>

            <div className="pt-4">
              <ManageCategoriesDialog serverId={serverId} />
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <div className="space-y-4">
              <CustomRolesDialog serverId={serverId} userRole={userRole} />
              <ServerRolesDialog serverId={serverId} userRole={userRole} />
            </div>
          </TabsContent>

          <TabsContent value="channels">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {channels.map((channel) => (
                  <div key={channel.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span className="font-semibold">{channel.name}</span>
                        {channel.is_private && (
                          <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                            Private
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`private-${channel.id}`}>Private</Label>
                        <Switch
                          id={`private-${channel.id}`}
                          checked={channel.is_private}
                          onCheckedChange={() =>
                            toggleChannelPrivacy(channel.id, channel.is_private)
                          }
                        />
                      </div>
                    </div>

                    {channel.is_private && roles.length > 0 && (
                      <div className="space-y-2 pl-6 border-l-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          Role Permissions
                        </p>
                        {roles.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-center justify-between gap-4 p-2 rounded bg-background/50"
                          >
                            <span
                              className="text-sm font-medium"
                              style={{ color: role.color }}
                            >
                              {role.name}
                            </span>
                            <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`view-${channel.id}-${role.id}`}>
                                  View
                                </Label>
                                <Switch
                                  id={`view-${channel.id}-${role.id}`}
                                  checked={getPermission(channel.id, role.id, "can_view")}
                                  onCheckedChange={() =>
                                    toggleChannelPermission(
                                      channel.id,
                                      role.id,
                                      "can_view",
                                      getPermission(channel.id, role.id, "can_view")
                                    )
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`send-${channel.id}-${role.id}`}>
                                  Send
                                </Label>
                                <Switch
                                  id={`send-${channel.id}-${role.id}`}
                                  checked={getPermission(
                                    channel.id,
                                    role.id,
                                    "can_send_messages"
                                  )}
                                  onCheckedChange={() =>
                                    toggleChannelPermission(
                                      channel.id,
                                      role.id,
                                      "can_send_messages",
                                      getPermission(
                                        channel.id,
                                        role.id,
                                        "can_send_messages"
                                      )
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            <div className="border border-destructive rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-destructive">Delete Server</h3>
              <p className="text-sm text-muted-foreground">
                Once you delete a server, there is no going back. All channels, messages,
                and data will be permanently deleted.
              </p>
              <Button
                variant="destructive"
                onClick={deleteServer}
                disabled={loading}
              >
                Delete Server Permanently
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ServerSettingsDialog;