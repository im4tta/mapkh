
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Users, Trash2, X, Check, MessageSquare, ThumbsUp, FilePlus2, Edit, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Notification, NOTIFICATION_TYPES, Report } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getReportByNumericId, deleteNotification, dismissNotification, dismissAllCommunityNotifications } from '@/app/actions';
import { useActivityDialog } from '@/context/activity-dialog-provider';
import { cn } from '@/lib/utils';
import { notificationCategories } from '@/lib/notification-config';

const NotificationItem = ({ notification, onClose, onDismiss }: { notification: Notification, onClose: () => void, onDismiss: (id: string) => void }) => {
  const Icon = NOTIFICATION_TYPES[notification.type]?.icon || Bell;
  const router = useRouter();
  const pathname = usePathname();
  const { showActivityDialog } = useActivityDialog();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Parse report details and extract category
  let reportDetails: any = {};
  let category = '';
  try {
    reportDetails = JSON.parse(notification.reportDetails);
    category = reportDetails.category || '';
  } catch (error) {
    console.error('Error parsing notification reportDetails:', error);
    reportDetails = { reportNumber: 0, description: '', position: { lat: 0, lng: 0 }};
  }
  
  // Find category configuration
  const categoryConfig = notificationCategories.find(cat => cat.id === category);
  
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
      setIsDismissed(notification.dismissedBy?.includes(user?.uid || '') || false);
  }, [notification, user]);


  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (notification.type === 'comment') {
      const result = await getReportByNumericId(reportDetails.reportNumber);
      if (result.success && result.data) {
        showActivityDialog(result.data, 'comments');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the report for this comment.' });
      }
    } else if (notification.type === 'mention' || notification.type === 'reply') {
      // Handle mention and reply notifications - navigate to community page
      router.push('/community');
    } else if (reportDetails.reportNumber) {
      router.push(`/records/${reportDetails.reportNumber}`);
    }
    
    onClose();
  }

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsDismissed(true); // Optimistically update UI
    onDismiss(notification.id);
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg transition-all duration-300 cursor-pointer',
        !isDismissed ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-muted/80 opacity-50',
        isDismissed && 'h-0 py-0 opacity-0 my-[-1px]' // Animate out
      )}
      style={{
          transition: 'padding-top 0.3s ease, padding-bottom 0.3s ease, margin-top 0.3s ease, margin-bottom 0.3s ease, opacity 0.3s ease',
      }}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 pt-1">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium">{notification.title}</p>
          {categoryConfig && (
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-full",
              categoryConfig.priority === 'high' && "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
              categoryConfig.priority === 'normal' && "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
              categoryConfig.priority === 'low' && "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
            )}>
              {categoryConfig.name}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : ''}
        </p>
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDeleteClick}
            title="Dismiss"
        >
            <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};


export function NotificationsPopover() {
  const { user } = useAuth();
  const [communityNotifications, setCommunityNotifications] = useState<Notification[]>([]);
  const [personalNotifications, setPersonalNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Fetch community notifications (userId is null)
    const communityQuery = query(collection(db, 'notifications'), where('userId', '==', null));
    const unsubCommunity = onSnapshot(communityQuery, 
        (snapshot) => {
            let notifs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Notification));
            notifs.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
            setCommunityNotifications(notifs);
            if (isLoading) setIsLoading(false);
        }, 
        (err) => {
            console.error(`Error fetching community notifications:`, err);
            toast({ variant: 'destructive', title: `Failed to load community notifications.` });
            if (isLoading) setIsLoading(false);
        }
    );

    // Fetch personal notifications (userId matches current user)
    const personalQuery = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsubPersonal = onSnapshot(personalQuery, 
        (snapshot) => {
            let notifs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Notification));
            notifs.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
            setPersonalNotifications(notifs);
        }, 
        (err) => {
            console.error(`Error fetching personal notifications:`, err);
            toast({ variant: 'destructive', title: `Failed to load personal notifications.` });
        }
    );

    return () => {
      unsubCommunity();
      unsubPersonal();
    };
  }, [user, toast]);

  // Group notifications by action type
  const groupedNotifications = useMemo(() => {
    // Combine community and personal notifications
    const allNotifications = [...communityNotifications, ...personalNotifications];
    
    const groups = {
      all: allNotifications,
      comments: allNotifications.filter(n => ['comment', 'mention', 'reply'].includes(n.type)),
      verification: allNotifications.filter(n => n.type === 'verification'),
      creation: allNotifications.filter(n => ['new_report', 'new_user'].includes(n.type)),
      updates: allNotifications.filter(n => ['report_edited', 'status_change', 'archived'].includes(n.type)),
      achievements: allNotifications.filter(n => n.type === 'new_badge')
    };
    return groups;
  }, [communityNotifications, personalNotifications]);

  // Count unread notifications per tab
  const tabCounts = useMemo(() => {
    if (!user?.uid) return { all: 0, comments: 0, verification: 0, creation: 0, updates: 0, achievements: 0 };
    
    return {
      all: groupedNotifications.all.filter(n => !n.dismissedBy?.includes(user.uid)).length,
      comments: groupedNotifications.comments.filter(n => !n.dismissedBy?.includes(user.uid)).length,
      verification: groupedNotifications.verification.filter(n => !n.dismissedBy?.includes(user.uid)).length,
      creation: groupedNotifications.creation.filter(n => !n.dismissedBy?.includes(user.uid)).length,
      updates: groupedNotifications.updates.filter(n => !n.dismissedBy?.includes(user.uid)).length,
      achievements: groupedNotifications.achievements.filter(n => !n.dismissedBy?.includes(user.uid)).length
    };
  }, [groupedNotifications, user?.uid]);

  const unreadCount = useMemo(() => {
    if (!user?.uid) return 0;
    return tabCounts.all;
  }, [tabCounts.all, user?.uid]);

  useEffect(() => {
    // Use the Badging API to show unread count on the app icon
    if (typeof window !== 'undefined' && 'navigator' in window && 'setAppBadge' in navigator) {
        if (unreadCount > 0) {
            // @ts-ignore
            navigator.setAppBadge(unreadCount);
        } else {
            // @ts-ignore
            navigator.clearAppBadge();
        }
    }
  }, [unreadCount]);


  const handleDismissCommunityNotification = async (id: string) => {
      const result = await dismissNotification(id, user?.uid);
       if (!result.success) {
        toast({
            variant: 'destructive',
            title: "Error",
            description: "Failed to dismiss notification. It may reappear on refresh."
        });
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return;
    const result = await dismissAllCommunityNotifications(user.uid);
    if (result.success) {
        toast({
            title: "Notifications marked as read",
            description: "All community notifications have been dismissed.",
        });
    } else {
         toast({
            variant: 'destructive',
            title: "Error",
            description: "Failed to mark all notifications as read."
        });
    }
  }

  const onOpenChange = (open: boolean) => {
      setIsOpen(open);
      // When the popover is opened, clear the badge
      if (open && 'clearAppBadge' in navigator) {
        // @ts-ignore
        navigator.clearAppBadge();
      }
  }

  const NotificationList = ({ notifications }: { notifications: Notification[] }) => {
      if (isLoading) {
          return (
             <div className="p-4 space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
             </div>
          )
      }
      if (notifications.length === 0) {
          return <p className="p-8 text-center text-sm text-muted-foreground">No notifications yet.</p>;
      }
      return (
        <>
            {notifications.map(notif => (
              <NotificationItem 
                key={notif.id} 
                notification={notif} 
                onClose={() => setIsOpen(false)} 
                onDismiss={handleDismissCommunityNotification}
              />
            ))}
        </>
      )
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 flex justify-between items-center border-b">
          <h4 className="font-medium text-sm">Community Notifications</h4>
          {unreadCount > 0 && (
             <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-7 text-xs">
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all as read
            </Button>
          )}
        </div>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-8 p-0 bg-muted/50">
            <TabsTrigger value="all" className="text-xs px-1 py-1 relative">
              All
              {tabCounts.all > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {tabCounts.all > 9 ? '9+' : tabCounts.all}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs px-1 py-1 relative">
              <MessageSquare className="h-3 w-3" />
              {tabCounts.comments > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {tabCounts.comments > 9 ? '9+' : tabCounts.comments}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="verification" className="text-xs px-1 py-1 relative">
              <ThumbsUp className="h-3 w-3" />
              {tabCounts.verification > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {tabCounts.verification > 9 ? '9+' : tabCounts.verification}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="creation" className="text-xs px-1 py-1 relative">
              <FilePlus2 className="h-3 w-3" />
              {tabCounts.creation > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {tabCounts.creation > 9 ? '9+' : tabCounts.creation}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="updates" className="text-xs px-1 py-1 relative">
              <Edit className="h-3 w-3" />
              {tabCounts.updates > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {tabCounts.updates > 9 ? '9+' : tabCounts.updates}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs px-1 py-1 relative">
              <Award className="h-3 w-3" />
              {tabCounts.achievements > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {tabCounts.achievements > 9 ? '9+' : tabCounts.achievements}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-1">
                <NotificationList notifications={groupedNotifications.all} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="comments" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-1">
                <NotificationList notifications={groupedNotifications.comments} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="verification" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-1">
                <NotificationList notifications={groupedNotifications.verification} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="creation" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-1">
                <NotificationList notifications={groupedNotifications.creation} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="updates" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-1">
                <NotificationList notifications={groupedNotifications.updates} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="achievements" className="mt-0">
            <ScrollArea className="h-96">
              <div className="p-1">
                <NotificationList notifications={groupedNotifications.achievements} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
