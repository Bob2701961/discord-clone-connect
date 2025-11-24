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
import { Shield, Crown, Ban, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Member {
  user_id: string;
  role: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ServerRolesDialogProps {
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

const ServerRolesDialog = ({ serverId, userRole }: ServerRolesDialogProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
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
      const formattedMembers = data.map((m: any) => ({
        user_id: m.user_id,
        role: m.server_roles[0]?.role || "member",
        profiles: m.profiles,
      }));
      setMembers(formattedMembers);
    }
  };

  const updateRole = async (userId: string, newRole: "owner" | "admin" | "moderator" | "member") => {
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

  const canManageRoles = userRole === "owner" || userRole === "admin";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Shield className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Server Roles</DialogTitle>
          <DialogDescription>
            Manage member roles and permissions
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {members.map((member) => {
              const RoleIcon = roleIcons[member.role as keyof typeof roleIcons];
              const roleColor = roleColors[member.role as keyof typeof roleColors];
              
              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
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
                        onValueChange={(value) => updateRole(member.user_id, value as "owner" | "admin" | "moderator" | "member")}
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
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ServerRolesDialog;
