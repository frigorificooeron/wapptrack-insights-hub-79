import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "@/constants/funnelStatuses";
import { cn } from "@/lib/utils";

interface LeadStatusBadgeProps {
  status: string;
  className?: string;
}

export const LeadStatusBadge = ({ status, className }: LeadStatusBadgeProps) => {
  const config = getStatusConfig(status);
  
  return (
    <Badge 
      variant="secondary"
      className={cn(
        config.color,
        "text-white font-medium",
        className
      )}
      title={config.description}
    >
      {config.label}
    </Badge>
  );
};
