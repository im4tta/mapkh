"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserGuideDialog } from './user-guide-dialog';
import { useTranslation } from 'react-i18next';
import { BookOpen, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserGuideButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'floating';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function UserGuideButton({ 
  variant = 'outline', 
  size = 'default',
  className = '' 
}: UserGuideButtonProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { t } = useTranslation();

  if (variant === 'floating') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsGuideOpen(true)}
                size="lg"
                className={`fixed bottom-20 right-4 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
                aria-label={t('user_guide.button.tooltip', { defaultValue: 'Open User Guide' })}
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{t('user_guide.button.tooltip', { defaultValue: 'How to Submit Reports' })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <UserGuideDialog 
          isOpen={isGuideOpen} 
          onClose={() => setIsGuideOpen(false)} 
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsGuideOpen(true)}
        className={`gap-2 ${className}`}
      >
        <BookOpen className="h-4 w-4" />
        {t('user_guide.button.text', { defaultValue: 'User Guide' })}
      </Button>
      
      <UserGuideDialog 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </>
  );
}