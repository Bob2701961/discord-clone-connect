import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileSettingsDialog from "./ProfileSettingsDialog";

const DisplayNameWarningBanner = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    checkDisplayName();
  }, []);

  const checkDisplayName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (data && !data.display_name?.trim()) {
      setShowWarning(true);
    }
  };

  if (!showWarning) return null;

  return (
    <>
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Action Required: Set Your Display Name</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            You must set a display name by December 31, 2025, or your account will be deactivated.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="whitespace-nowrap"
          >
            Set Display Name
          </Button>
        </AlertDescription>
      </Alert>
      <ProfileSettingsDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onProfileUpdate={() => setShowWarning(false)}
      />
    </>
  );
};

export default DisplayNameWarningBanner;
