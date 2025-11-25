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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, FolderOpen } from "lucide-react";

interface Category {
  id: string;
  name: string;
  position: number;
}

interface ManageCategoriesDialogProps {
  serverId: string;
}

const ManageCategoriesDialog = ({ serverId }: ManageCategoriesDialogProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, serverId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("channel_categories")
      .select("*")
      .eq("server_id", serverId)
      .order("position", { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("channel_categories")
        .insert([{
          server_id: serverId,
          name: newCategoryName,
          position: categories.length,
        }]);

      if (error) throw error;

      toast.success("Category created successfully");
      setNewCategoryName("");
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("channel_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <FolderOpen className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Create and organize channel categories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">New Category</Label>
            <div className="flex gap-2">
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCategory()}
                placeholder="e.g., Text Channels, Voice Channels"
              />
              <Button onClick={createCategory} disabled={loading}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <p className="font-medium">{category.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCategory(category.id)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No categories created yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;
