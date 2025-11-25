import { Hash, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface CategorySectionProps {
  categoryName: string;
  channels: Channel[];
  selectedChannelId?: string;
  onChannelClick: (channelId: string) => void;
}

const CategorySection = ({
  categoryName,
  channels,
  selectedChannelId,
  onChannelClick,
}: CategorySectionProps) => {
  return (
    <div className="mb-4">
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {categoryName}
      </div>
      <div className="space-y-0.5">
        {channels.map((channel) => (
          <Button
            key={channel.id}
            variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
            className="w-full justify-start gap-2 px-2"
            onClick={() => onChannelClick(channel.id)}
          >
            {channel.type === "voice" ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <Hash className="w-4 h-4" />
            )}
            <span className="truncate">{channel.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategorySection;
