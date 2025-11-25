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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomRole {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
}

interface CustomRolesDialogProps {
  serverId: string;
  userRole: string;
}

const PERMISSIONS = [
  { id: "manage_channels", label: "Manage Channels" },
  { id: "manage_roles", label: "Manage Roles" },
  { id: "kick_members", label: "Kick Members" },
  { id: "ban_members", label: "Ban Members" },
  { id: "send_messages", label: "Send Messages" },
];

const CustomRolesDialog = ({ serverId, userRole }: CustomRolesDialogProps) => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#99AAB5");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "send_messages",
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, serverId]);

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("custom_roles")
      .select("*")
      .eq("server_id", serverId)
      .order("position", { ascending: true });

    if (!error && data) {
      setRoles(data);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("custom_roles")
        .insert([{
          server_id: serverId,
          name: newRoleName,
          color: newRoleColor,
          permissions: selectedPermissions as any,
          position: roles.length,
        }]);

      if (error) throw error;

      toast.success("Role created successfully");
      setNewRoleName("");
      setNewRoleColor("#99AAB5");
      setSelectedPermissions(["send_messages"]);
      fetchRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Role deleted successfully");
      fetchRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  const canManageRoles = userRole === "owner" || userRole === "admin";

  if (!canManageRoles) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Shield className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Custom Roles</DialogTitle>
          <DialogDescription>
            Create and manage custom roles with specific permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Role */}
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold">Create New Role</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., VIP, Helper"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-color">Role Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="role-color"
                    type="color"
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    placeholder="#99AAB5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-3">
                {PERMISSIONS.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={perm.id}
                      checked={selectedPermissions.includes(perm.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissions([...selectedPermissions, perm.id]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter((p) => p !== perm.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={perm.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={createRole} disabled={loading} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>

          {/* Existing Roles */}
          <div className="space-y-2">
            <h3 className="font-semibold">Existing Roles</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {role.permissions.length} permissions
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRole(role.id)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {roles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No custom roles created yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomRolesDialog;
