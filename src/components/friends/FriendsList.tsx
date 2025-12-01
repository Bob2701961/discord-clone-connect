import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, UserPlus, MessageCircle } from "lucide-react";
import AddFriendDialog from "./AddFriendDialog";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

const FriendsList = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchFriends();
      setupRealtimeSubscription();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchFriends = async () => {
    if (!currentUserId) return;

    // Fetch accepted friends
    const { data: acceptedFriends, error: friendsError } = await supabase
      .from("friendships")
      .select(`
        *,
        profile:profiles!friendships_friend_id_fkey(*)
      `)
      .eq("user_id", currentUserId)
      .eq("status", "accepted");

    if (friendsError) {
      toast.error("Failed to load friends");
      return;
    }

    setFriends(acceptedFriends || []);

    // Fetch pending requests (received)
    const { data: pending, error: pendingError } = await supabase
      .from("friendships")
      .select(`
        *,
        profile:profiles!friendships_user_id_fkey(*)
      `)
      .eq("friend_id", currentUserId)
      .eq("status", "pending");

    if (pendingError) {
      toast.error("Failed to load friend requests");
      return;
    }

    setPendingRequests(pending || []);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("friendships-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;

      // Create reciprocal friendship
      const request = pendingRequests.find((r) => r.id === friendshipId);
      if (request) {
        await supabase.from("friendships").insert({
          user_id: currentUserId,
          friend_id: request.user_id,
          status: "accepted",
        });
      }

      toast.success("Friend request accepted!");
      fetchFriends();
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      toast.success("Friend request declined");
      fetchFriends();
    } catch (error: any) {
      toast.error(error.message || "Failed to decline request");
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendId: string) => {
    try {
      // Delete both friendships
      await supabase
        .from("friendships")
        .delete()
        .or(`id.eq.${friendshipId},and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`);

      toast.success("Friend removed");
      fetchFriends();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove friend");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Friends</h2>
        <AddFriendDialog onFriendAdded={fetchFriends} />
      </div>

      <ScrollArea className="flex-1">
        {pendingRequests.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Pending Requests ({pendingRequests.length})
            </h3>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarImage src={request.profile.avatar_url || ""} />
                      <AvatarFallback>
                        {(request.profile.display_name || request.profile.username)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {request.profile.display_name || request.profile.username}
                      </p>
                      {request.profile.display_name && (
                        <p className="text-xs text-muted-foreground">
                          @{request.profile.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeclineRequest(request.id)}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            All Friends ({friends.length})
          </h3>
          {friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No friends yet</p>
              <p className="text-sm">Add friends to start chatting!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => navigate(`/dm/${friend.friend_id}`)}>
                    <Avatar>
                      <AvatarImage src={friend.profile.avatar_url || ""} />
                      <AvatarFallback>
                        {(friend.profile.display_name || friend.profile.username)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {friend.profile.display_name || friend.profile.username}
                      </p>
                      {friend.profile.display_name && (
                        <p className="text-xs text-muted-foreground">
                          @{friend.profile.username}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {friend.profile.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/dm/${friend.friend_id}`)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFriend(friend.id, friend.friend_id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FriendsList;
