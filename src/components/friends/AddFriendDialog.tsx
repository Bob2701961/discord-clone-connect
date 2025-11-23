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

interface AddFriendDialogProps {
  onFriendAdded: () => void;
}

const AddFriendDialog = ({ onFriendAdded }: AddFriendDialogProps) => {
  const [username, setUsername] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        toast.error("Please enter a username");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find user by username
      const { data: targetUser, error: userError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", trimmedUsername)
        .maybeSingle();

      if (userError) throw userError;

      if (!targetUser) {
        toast.error("User not found");
        setLoading(false);
        return;
      }

      if (targetUser.id === user.id) {
        toast.error("You cannot add yourself as a friend");
        setLoading(false);
        return;
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, status")
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === "pending") {
          toast.info("Friend request already sent");
        } else {
          toast.info("You are already friends");
        }
        setLoading(false);
        return;
      }

      // Send friend request
      const { error: insertError } = await supabase
        .from("friendships")
        .insert({
          user_id: user.id,
          friend_id: targetUser.id,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success(`Friend request sent to ${targetUser.username}!`);
      setUsername("");
      setIsOpen(false);
      onFriendAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add friend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Enter a username to send a friend request
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddFriend} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="cooluser123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Friend Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendDialog;
