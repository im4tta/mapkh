
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommunityTalk } from '@/components/community-talk';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ChatDialog({ isOpen, onOpenChange }: ChatDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('contributions.tabs.talk')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col overflow-hidden px-6 pb-6 mt-0">
          <CommunityTalk />
        </div>
      </DialogContent>
    </Dialog>
  );
}
