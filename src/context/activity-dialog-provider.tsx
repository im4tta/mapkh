
"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Report } from '@/lib/types';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface ActivityDialogContextType {
  isActivityDialogOpen: boolean;
  activeReport: Report | null;
  defaultTab: 'comments' | 'history';
  showActivityDialog: (report: Report, defaultTab: 'comments' | 'history') => void;
  hideActivityDialog: () => void;
}

const ActivityDialogContext = createContext<ActivityDialogContextType | undefined>(undefined);

export const ActivityDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [defaultTab, setDefaultTab] = useState<'comments' | 'history'>('history');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const showActivityDialog = useCallback((report: Report, tab: 'comments' | 'history' = 'history') => {
    setActiveReport(report);
    setDefaultTab(tab);
    setIsActivityDialogOpen(true);
    
    // Update URL to reflect the open dialog state
    const params = new URLSearchParams(searchParams.toString());
    params.set('report_id', report.reportNumber.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

  }, [router, searchParams, pathname]);

  const hideActivityDialog = useCallback(() => {
    setIsActivityDialogOpen(false);
    
    // Update URL to remove dialog state
    const params = new URLSearchParams(searchParams.toString());
    params.delete('report_id');
    params.delete('tab');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Delay clearing the report to allow for exit animation
    setTimeout(() => {
      setActiveReport(null);
    }, 300);
  }, [router, searchParams, pathname]);
  
    useEffect(() => {
        // This effect can be used to open the dialog based on URL if needed
        // For now, it's primarily handled by the page/component that calls showActivityDialog
    }, [searchParams, showActivityDialog]);


  const value = {
    isActivityDialogOpen,
    activeReport,
    defaultTab,
    showActivityDialog,
    hideActivityDialog,
  };

  return (
    <ActivityDialogContext.Provider value={value}>
      {children}
    </ActivityDialogContext.Provider>
  );
};

export const useActivityDialog = () => {
  const context = useContext(ActivityDialogContext);
  if (context === undefined) {
    throw new Error('useActivityDialog must be used within an ActivityDialogProvider');
  }
  return context;
};
