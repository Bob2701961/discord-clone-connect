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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
}

const ProfileSettingsDialog = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedDisplayName = displayName.trim();
      const trimmedUsername = username.trim();

      if (!trimmedUsername) {
        toast.error("Username cannot be empty");
        setLoading(false);
        return;
      }

      if (trimmedUsername.length > 50) {
        toast.error("Username must be less than 50 characters");
        setLoading(false);
        return;
      }

      if (trimmedDisplayName.length > 100) {
        toast.error("Display name must be less than 100 characters");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          username: trimmedUsername,
          display_name: trimmedDisplayName || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated!");
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("File must be an image");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated!");
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile information and avatar
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback>
                {(profile?.display_name || profile?.username || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
                id="avatar-upload"
              />
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Avatar"}
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Max 2MB • JPG, PNG, or GIF
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {displayName.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="cooluser123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={50}
              required
            />
            <p className="text-xs text-muted-foreground">
              {username.length}/50 characters
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsDialog;
