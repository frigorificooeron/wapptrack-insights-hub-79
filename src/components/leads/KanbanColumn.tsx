import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Lead } from '@/types';
import { KanbanCard } from './KanbanCard';
import { FunnelStatus, getStatusConfig } from '@/constants/funnelStatuses';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: FunnelStatus;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onOpenWhatsApp: (phone: string) => void;
  isDragging: boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  leads,
  onLeadClick,
  onOpenWhatsApp,
  isDragging
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status
  });

  const config = getStatusConfig(status);

  return (
    <div className="flex flex-col h-full">
      <div className={cn(
        "flex items-center justify-between p-3 rounded-t-lg border-b-2",
        config.color.replace('bg-', 'border-'),
        "bg-card"
      )}>
        <h3 className="font-semibold text-sm">{config.label}</h3>
        <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 min-h-[500px] bg-muted/20 rounded-b-lg border border-t-0 transition-colors",
          isOver && isDragging && "bg-primary/10 border-primary",
          !isDragging && "border-border"
        )}
      >
        {leads.map(lead => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onLeadClick={onLeadClick}
            onOpenWhatsApp={onOpenWhatsApp}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
};
