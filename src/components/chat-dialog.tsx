
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommunityTalk } from '@/components/community-talk';
import { LazyLoadTips } from '@/components/lazy-load-tips';
import { MessageSquare, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  defaultTab: 'talk' | 'tips';
}

export function ChatDialog({ isOpen, onOpenChange, defaultTab }: ChatDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0">
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle className="sr-only">Community</DialogTitle>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="talk">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t('contributions.tabs.talk')}
                    </TabsTrigger>
                    <TabsTrigger value="tips">
                        <Info className="mr-2 h-4 w-4" />
                        {t('contributions.tabs.tips')}
                    </TabsTrigger>
                </TabsList>
            </DialogHeader>
            <TabsContent value="talk" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden px-6 pb-6 mt-0">
                <CommunityTalk />
            </TabsContent>
            <TabsContent value="tips" className="flex-1 overflow-hidden data-[state=inactive]:hidden px-6 pb-6 mt-0">
                <LazyLoadTips />
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
