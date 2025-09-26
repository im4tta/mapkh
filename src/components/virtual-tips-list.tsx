import React, { memo, useMemo, useCallback } from 'react';
// @ts-ignore - react-window typing issues
import { List } from 'react-window';
import { Tip, tipIcons, UserInfo } from '../lib/types';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';
import { Button } from '@/components/ui/button';
import { AddTipDialog } from '@/components/add-tip-dialog';
import { Pencil, Trash2, Info, LucideIcon } from 'lucide-react';

interface VirtualTipsListProps {
  tips?: Tip[]; // Make tips optional with default
  user: UserInfo | null;
  onEdit: (tip: Tip) => void;
  onDelete: (tip: Tip) => void;
  t: (key: string, options?: { ns?: string; defaultValue?: string }) => string;
  height: number;
}

interface TipItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    tips: Tip[];
    user: UserInfo | null;
    onEdit: (tip: Tip) => void;
    onDelete: (tip: Tip) => void;
    t: (key: string, options?: { ns?: string; defaultValue?: string }) => string;
  };
}

const VirtualTipItem = memo(({ index, style, data }: TipItemProps) => {
  // Add null check for data
  if (!data) {
    return (
      <div style={style} className="px-4 py-3 text-muted-foreground">
        Loading...
      </div>
    );
  }

  const { tips, user, onEdit, onDelete, t } = data;
  
  // Add null checks for tips array and index
  if (!tips || !Array.isArray(tips) || index >= tips.length) {
    return (
      <div style={style} className="px-4 py-3 text-muted-foreground">
        Invalid tip data
      </div>
    );
  }

  const tip = tips[index];

  // Error handling for undefined tip or missing properties
  if (!tip || !tip.id || !tip.title || !tip.content || !tip.createdBy) {
    return (
      <div style={style} className="px-4 py-3 text-muted-foreground">
        {t ? t('contributions.tips.invalid_tip', { defaultValue: 'Invalid tip data' }) : 'Invalid tip data'}
      </div>
    );
  }

  const getIcon = useCallback((iconName: string): LucideIcon => {
    // Add null/undefined checks for iconName
    if (!iconName || typeof iconName !== 'string') {
      return Info;
    }
    return tipIcons[iconName as keyof typeof tipIcons] || Info;
  }, []);

  // Add additional safety check for tip.icon
  const TipIcon = getIcon(tip.icon || 'Info');
  const canEdit = user?.uid === tip.createdBy?.uid;

  return (
    <div style={style}>
      <Accordion type="single" collapsible>
        <AccordionItem value={`tip-${tip.id}`} className="border-b">
          <AccordionTrigger className="px-4 py-2">
            <div className="flex items-center gap-3 w-full">
              <TipIcon className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 text-left">
                <span className="font-semibold block">
                  {t ? t(tip.title as any, { ns: 'translation', defaultValue: tip.title }) : tip.title}
                </span>
                <span className="text-sm text-muted-foreground">by {tip.createdBy?.name || 'Anonymous'}</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-2">
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">
                {t ? t(tip.content as any, { ns: 'translation', defaultValue: tip.content }) : tip.content}
              </p>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Created by {tip.createdBy?.name || 'Anonymous'}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <AddTipDialog tip={tip} onTipSaved={() => onEdit(tip)}>
                      <Button variant="outline" size="sm">
                        <Pencil className="mr-2 h-3 w-3" /> Edit
                      </Button>
                    </AddTipDialog>
                    <Button variant="outline" size="sm" onClick={() => onDelete(tip)}>
                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
});

VirtualTipItem.displayName = 'VirtualTipItem';

const RowComponent = memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: {
    tips: Tip[];
    user: UserInfo | null;
    onEdit: (tip: Tip) => void;
    onDelete: (tip: Tip) => void;
    t: (key: string, options?: { ns?: string; defaultValue?: string }) => string;
  };
}) => {
  // Guard against null/undefined data
  if (!data) {
    return (
      <div style={style} className="px-4 py-3 text-muted-foreground">
        Loading...
      </div>
    );
  }
  
  const { tips, user, onEdit, onDelete, t } = data;
  return <VirtualTipItem index={index} style={style} data={{ tips, user, onEdit, onDelete, t }} />;
});

RowComponent.displayName = 'RowComponent';

export const VirtualTipsList = memo(({ tips = [], user, onEdit, onDelete, t, height }: VirtualTipsListProps) => {
  // Use safe data with default empty array
  const safeData = tips ?? [];
  
  const itemData = useMemo(() => ({
    tips: safeData,
    user,
    onEdit,
    onDelete,
    t,
  }), [safeData, user, onEdit, onDelete, t]);

  // Add null checks for props
  if (!Array.isArray(safeData) || safeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        {t ? t('contributions.tips.no_tips', { defaultValue: 'No tips available' }) : 'No tips available'}
      </div>
    );
  }

  return (
    <List
      // @ts-ignore - react-window typing issues
      height={height}
      // @ts-ignore - react-window typing issues
      itemCount={safeData.length}
      // @ts-ignore - react-window typing issues
      itemSize={100} // Reduced from 120 to fix line spacing
      // @ts-ignore - react-window typing issues
      itemData={itemData}
      // @ts-ignore - react-window typing issues
      overscanCount={2} // Render 2 extra items for smoother scrolling
    >
      {RowComponent as any}
    </List>
  );
});

VirtualTipsList.displayName = 'VirtualTipsList';