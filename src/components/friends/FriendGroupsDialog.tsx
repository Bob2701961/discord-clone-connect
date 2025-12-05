import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Check, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

interface Friend {
  id: string;
  friend_id: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FriendGroup {
  id: string;
  name: string;
  members: string[];
  dmChannelId?: string;
}

interface FriendGroupsDialogProps {
  friends: Friend[];
  currentUserId: string;
}

const FriendGroupsDialog = ({ friends, currentUserId }: FriendGroupsDialogProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // Load groups from localStorage
  useEffect(() => {
    const savedGroups = localStorage.getItem(`friend_groups_${currentUserId}`);
    if (savedGroups) {
      setGroups(JSON.parse(savedGroups));
    }
  }, [currentUserId]);

  // Save groups to localStorage
  const saveGroups = (newGroups: FriendGroup[]) => {
    localStorage.setItem(`friend_groups_${currentUserId}`, JSON.stringify(newGroups));
    setGroups(newGroups);
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedFriends.length < 1) {
      toast.error("Please select at least one friend");
      return;
    }

    // Create a group DM channel
    const { data: newChannel, error: channelError } = await supabase
      .from("dm_channels")
      .insert([{}])
      .select("id")
      .single();

    if (channelError) {
      toast.error("Failed to create group chat");
      return;
    }

    // Add all participants including current user
    const participants = [currentUserId, ...selectedFriends];
    const { error: participantsError } = await supabase
      .from("dm_participants")
      .insert(participants.map(userId => ({
        dm_channel_id: newChannel.id,
        user_id: userId,
      })));

    if (participantsError) {
      toast.error("Failed to add group members");
      return;
    }

    const newGroup: FriendGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      members: selectedFriends,
      dmChannelId: newChannel.id,
    };

    saveGroups([...groups, newGroup]);
    setNewGroupName("");
    setSelectedFriends([]);
    setShowCreate(false);
    toast.success("Group created!");
  };

  const deleteGroup = (groupId: string) => {
    saveGroups(groups.filter(g => g.id !== groupId));
    toast.success("Group deleted");
  };

  const openGroupChat = (group: FriendGroup) => {
    if (group.dmChannelId) {
      navigate(`/group/${group.dmChannelId}`);
      setOpen(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const getFriendProfile = (friendId: string) => {
    return friends.find(f => f.friend_id === friendId)?.profile;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Friend Groups</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreate ? (
            <>
              <Button 
                onClick={() => setShowCreate(true)} 
                className="w-full gap-2"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                Create New Group
              </Button>

              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No groups yet. Create one to chat with multiple friends!
                    </p>
                  ) : (
                    groups.map(group => (
                      <div 
                        key={group.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.members.length} members
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openGroupChat(group)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteGroup(group.id)}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              
              <div>
                <p className="text-sm font-medium mb-2">Select Friends</p>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {friends.map(friend => (
                      <div 
                        key={friend.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => toggleFriend(friend.friend_id)}
                      >
                        <Checkbox 
                          checked={selectedFriends.includes(friend.friend_id)}
                          onCheckedChange={() => toggleFriend(friend.friend_id)}
                        />
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={friend.profile.avatar_url || ""} />
                          <AvatarFallback>
                            {(friend.profile.display_name || friend.profile.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {friend.profile.display_name || friend.profile.username}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => { setShowCreate(false); setSelectedFriends([]); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={createGroup} className="flex-1">
                  Create Group
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendGroupsDialog;
