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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Crown, User, Plus, Trash2, UserPlus, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Member {
  user_id: string;
  role: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  customRoles?: { id: string; name: string; color: string }[];
}

interface CustomRole {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
}

interface ServerManagementDialogProps {
  serverId: string;
  userRole: string;
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  moderator: Shield,
  member: User,
};

const roleColors = {
  owner: "text-yellow-500",
  admin: "text-red-500",
  moderator: "text-blue-500",
  member: "text-muted-foreground",
};

const PERMISSIONS = [
  { id: "manage_channels", label: "Manage Channels" },
  { id: "manage_roles", label: "Manage Roles" },
  { id: "kick_members", label: "Kick Members" },
  { id: "ban_members", label: "Ban Members" },
  { id: "send_messages", label: "Send Messages" },
];

const ServerManagementDialog = ({ serverId, userRole }: ServerManagementDialogProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  
  // New role form
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#99AAB5");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["send_messages"]);
  
  // Add member form
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Assign role to member
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedCustomRole, setSelectedCustomRole] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchCustomRoles();
    }
  }, [isOpen, serverId]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("server_members")
      .select(`
        user_id,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        ),
        server_roles!inner (
          role
        )
      `)
      .eq("server_id", serverId);

    if (!error && data) {
      // Fetch role assignments for each member
      const { data: roleAssignments } = await supabase
        .from("role_assignments")
        .select(`
          user_id,
          custom_roles (
            id,
            name,
            color
          )
        `)
        .eq("server_id", serverId);

      const formattedMembers = data.map((m: any) => {
        const memberRoleAssignments = roleAssignments?.filter(
          (ra: any) => ra.user_id === m.user_id
        ) || [];
        
        return {
          user_id: m.user_id,
          role: m.server_roles[0]?.role || "member",
          profiles: m.profiles,
          customRoles: memberRoleAssignments.map((ra: any) => ra.custom_roles),
        };
      });
      setMembers(formattedMembers);
    }
  };

  const fetchCustomRoles = async () => {
    const { data, error } = await supabase
      .from("custom_roles")
      .select("*")
      .eq("server_id", serverId)
      .order("position", { ascending: true });

    if (!error && data) {
      setCustomRoles(data);
    }
  };

  const updateServerRole = async (userId: string, newRole: "admin" | "moderator" | "member") => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("server_roles")
        .update({ role: newRole })
        .eq("server_id", serverId)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Role updated successfully");
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const createCustomRole = async () => {
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
          position: customRoles.length,
        }]);

      if (error) throw error;

      toast.success("Role created successfully");
      setNewRoleName("");
      setNewRoleColor("#99AAB5");
      setSelectedPermissions(["send_messages"]);
      fetchCustomRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomRole = async (roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Role deleted successfully");
      fetchCustomRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchUsername.trim()) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .ilike("username", `%${searchUsername}%`)
      .limit(10);

    if (!error && data) {
      // Filter out existing members
      const existingUserIds = members.map(m => m.user_id);
      setSearchResults(data.filter(u => !existingUserIds.includes(u.id)));
    }
  };

  const addMemberToServer = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("server_members")
        .insert([{ server_id: serverId, user_id: userId }]);

      if (error) throw error;

      toast.success("Member added successfully");
      setSearchUsername("");
      setSearchResults([]);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const assignCustomRole = async (userId: string, roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("role_assignments")
        .insert([{
          server_id: serverId,
          user_id: userId,
          custom_role_id: roleId,
        }]);

      if (error) throw error;

      toast.success("Role assigned successfully");
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign role");
    } finally {
      setLoading(false);
    }
  };

  const removeCustomRole = async (userId: string, roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("role_assignments")
        .delete()
        .eq("server_id", serverId)
        .eq("user_id", userId)
        .eq("custom_role_id", roleId);

      if (error) throw error;

      toast.success("Role removed successfully");
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove role");
    } finally {
      setLoading(false);
    }
  };

  const canManageRoles = userRole === "owner" || userRole === "admin";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Server Management</DialogTitle>
          <DialogDescription>
            Manage members, roles, and permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="roles">Custom Roles</TabsTrigger>
            <TabsTrigger value="add">Add Members</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role as keyof typeof roleIcons];
                  const roleColor = roleColors[member.role as keyof typeof roleColors];
                  
                  return (
                    <div
                      key={member.user_id}
                      className="flex flex-col gap-2 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.profiles?.avatar_url || ""} />
                            <AvatarFallback>
                              {(member.profiles?.display_name || member.profiles?.username || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profiles?.display_name || member.profiles?.username}
                            </p>
                            {member.profiles?.display_name && (
                              <p className="text-xs text-muted-foreground">
                                @{member.profiles?.username}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RoleIcon className={`w-4 h-4 ${roleColor}`} />
                          {canManageRoles && member.role !== "owner" ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) => updateServerRole(member.user_id, value as "admin" | "moderator" | "member")}
                              disabled={loading}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                {userRole === "owner" && (
                                  <SelectItem value="admin">Admin</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`text-sm font-medium ${roleColor} capitalize`}>
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Custom Roles */}
                      {canManageRoles && (
                        <div className="flex flex-wrap items-center gap-2 ml-13">
                          {member.customRoles?.map((cr) => (
                            <div
                              key={cr.id}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                              style={{ backgroundColor: cr.color + "33", color: cr.color }}
                            >
                              {cr.name}
                              <button
                                onClick={() => removeCustomRole(member.user_id, cr.id)}
                                className="ml-1 hover:opacity-70"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {customRoles.length > 0 && (
                            <Select
                              value=""
                              onValueChange={(roleId) => assignCustomRole(member.user_id, roleId)}
                            >
                              <SelectTrigger className="w-32 h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" />
                                Add Role
                              </SelectTrigger>
                              <SelectContent>
                                {customRoles
                                  .filter(cr => !member.customRoles?.some(mcr => mcr.id === cr.id))
                                  .map((cr) => (
                                    <SelectItem key={cr.id} value={cr.id}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: cr.color }}
                                        />
                                        {cr.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Custom Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            {canManageRoles && (
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
                          className="text-sm font-medium leading-none"
                        >
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={createCustomRole} disabled={loading} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Existing Roles</h3>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2 pr-4">
                  {customRoles.map((role) => (
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
                      {canManageRoles && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCustomRole(role.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {customRoles.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No custom roles created yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Add Members Tab */}
          <TabsContent value="add" className="space-y-4">
            {canManageRoles && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    placeholder="Search by username..."
                    onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  />
                  <Button onClick={searchUsers} disabled={loading}>
                    Search
                  </Button>
                </div>

                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatar_url || ""} />
                            <AvatarFallback>
                              {(user.display_name || user.username).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.display_name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addMemberToServer(user.id)}
                          disabled={loading}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    ))}
                    {searchResults.length === 0 && searchUsername && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No users found
                      </p>
                    )}
                    {!searchUsername && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Search for users to add to the server
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ServerManagementDialog;