
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Users, Trash2, X, Check, MessageSquare, ThumbsUp, FilePlus2, Edit, Award, List } from 'lucide-react';
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
    // Check if reportDetails is already an object or a valid JSON string
    if (typeof notification.reportDetails === 'object' && notification.reportDetails !== null) {
      reportDetails = notification.reportDetails;
    } else if (typeof notification.reportDetails === 'string') {
      // Handle the case where reportDetails might be "[object Object]" or other invalid JSON
      if (notification.reportDetails === '[object Object]' || notification.reportDetails.trim() === '') {
        console.warn('Invalid reportDetails detected:', notification.reportDetails);
        reportDetails = { reportNumber: 0, description: '', position: { lat: 0, lng: 0 }};
      } else {
        reportDetails = JSON.parse(notification.reportDetails);
      }
    } else {
      reportDetails = { reportNumber: 0, description: '', position: { lat: 0, lng: 0 }};
    }
    category = reportDetails.category || '';
  } catch (error) {
    console.error('Error parsing notification reportDetails:', error, 'Raw value:', notification.reportDetails);
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
    onDismiss(notification.id);
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 mb-2 rounded-lg transition-all duration-200 cursor-pointer',
        !isDismissed ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-muted/80 opacity-50'
      )}
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
    try {
      const result = await dismissNotification(id, user?.uid);
      if (result.success) {
        // Update badge count after successful dismissal
        const newUnreadCount = unreadCount - 1;
        if ('setAppBadge' in navigator) {
          try {
            if (newUnreadCount > 0) {
              await (navigator as any).setAppBadge(newUnreadCount);
            } else {
              await (navigator as any).clearAppBadge();
            }
          } catch (badgeError) {
            console.warn('Failed to update app badge:', badgeError);
          }
        }
      } else {
        toast({
          variant: 'destructive',
          title: "Error",
          description: result.error || "Failed to dismiss notification. It may reappear on refresh."
        });
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "An unexpected error occurred while dismissing the notification."
      });
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return;
    
    try {
      // Dismiss all community notifications
      const communityResult = await dismissAllCommunityNotifications(user.uid);
      
      // Dismiss all personal notifications
      const personalNotificationIds = personalNotifications
        .filter(n => !n.dismissedBy?.includes(user.uid))
        .map(n => n.id);
      
      let personalResults = [];
      for (const id of personalNotificationIds) {
        const result = await dismissNotification(id, user.uid);
        personalResults.push(result);
      }
      
      const allSuccessful = communityResult.success && personalResults.every(r => r.success);
      
      if (allSuccessful) {
        // Clear the badge count after successfully marking all as read
        if ('clearAppBadge' in navigator) {
          try {
            await (navigator as any).clearAppBadge();
          } catch (badgeError) {
            console.warn('Failed to clear app badge:', badgeError);
          }
        }
        
        toast({
          title: "All notifications cleared",
          description: "All notifications have been marked as read.",
        });
      } else {
        const failedCount = personalResults.filter(r => !r.success).length + (communityResult.success ? 0 : 1);
        toast({
          variant: 'destructive',
          title: "Partial success",
          description: `${failedCount} notification(s) could not be cleared. Please try again.`
        });
      }
    } catch (error) {
      console.error('Error in handleMarkAllRead:', error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "An unexpected error occurred while clearing notifications."
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
          <TabsList className="grid w-full grid-cols-6 h-10 gap-1 p-1">
            <TabsTrigger value="all" className="text-xs px-2 py-2 relative min-w-0 flex items-center justify-center">
              <List className="h-3 w-3" />
              {tabCounts.all > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-medium z-10">
                  {tabCounts.all > 9 ? '9+' : tabCounts.all}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs px-2 py-2 relative min-w-0 flex items-center justify-center">
              <MessageSquare className="h-3 w-3" />
              {tabCounts.comments > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-medium z-10">
                  {tabCounts.comments > 9 ? '9+' : tabCounts.comments}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="verification" className="text-xs px-2 py-2 relative min-w-0 flex items-center justify-center">
              <ThumbsUp className="h-3 w-3" />
              {tabCounts.verification > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-medium z-10">
                  {tabCounts.verification > 9 ? '9+' : tabCounts.verification}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="creation" className="text-xs px-2 py-2 relative min-w-0 flex items-center justify-center">
              <FilePlus2 className="h-3 w-3" />
              {tabCounts.creation > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-medium z-10">
                  {tabCounts.creation > 9 ? '9+' : tabCounts.creation}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="updates" className="text-xs px-2 py-2 relative min-w-0 flex items-center justify-center">
              <Edit className="h-3 w-3" />
              {tabCounts.updates > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-medium z-10">
                  {tabCounts.updates > 9 ? '9+' : tabCounts.updates}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs px-2 py-2 relative min-w-0 flex items-center justify-center">
              <Award className="h-3 w-3" />
              {tabCounts.achievements > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-medium z-10">
                  {tabCounts.achievements > 9 ? '9+' : tabCounts.achievements}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-2">
            <ScrollArea className="h-96">
              <div className="p-2 space-y-1">
                <NotificationList notifications={groupedNotifications.all} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="comments" className="mt-2">
            <ScrollArea className="h-96">
              <div className="p-2 space-y-1">
                <NotificationList notifications={groupedNotifications.comments} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="verification" className="mt-2">
            <ScrollArea className="h-96">
              <div className="p-2 space-y-1">
                <NotificationList notifications={groupedNotifications.verification} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="creation" className="mt-2">
            <ScrollArea className="h-96">
              <div className="p-2 space-y-1">
                <NotificationList notifications={groupedNotifications.creation} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="updates" className="mt-2">
            <ScrollArea className="h-96">
              <div className="p-2 space-y-1">
                <NotificationList notifications={groupedNotifications.updates} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="achievements" className="mt-2">
            <ScrollArea className="h-96">
              <div className="p-2 space-y-1">
                <NotificationList notifications={groupedNotifications.achievements} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
