
"use client";

import { Header } from '@/components/header';
import { BottomNav } from './bottom-nav';
import { Footer } from './footer';
import { useActivityDialog } from '@/context/activity-dialog-provider';
import { ReportActivityDialog } from './report-activity-dialog';
import { ScrollToTopButton } from './scroll-to-top';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isActivityDialogOpen, activeReport, defaultTab, hideActivityDialog } = useActivityDialog();
  const pathname = usePathname();
  const isMapPage = pathname === '/map';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header />
      <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
      {!isMapPage && <Footer />}
      <div className="md:hidden">
        <BottomNav />
      </div>
      
      {activeReport && (
        <ReportActivityDialog 
          isOpen={isActivityDialogOpen}
          onClose={hideActivityDialog}
          report={activeReport}
          defaultTab={defaultTab}
        />
      )}
      <ScrollToTopButton />
    </div>
  );
}
