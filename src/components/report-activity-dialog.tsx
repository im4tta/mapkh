
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Report, type HistoryLog, Comment, ChangeDetail } from '@/lib/types';
import { addComment } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare, History as HistoryIcon } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/auth-provider';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { collection, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Badge } from './ui/badge';

interface ReportActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  defaultTab?: 'comments' | 'history';
}

const commentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty.'),
});

const HistoryTab = ({ reportId }: { reportId: string }) => {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const generateLogMessage = useCallback((log: HistoryLog) => {
    if (log.action === 'report_submitted') {
      return t('history_actions.report_submitted_details', { details: log.details });
    }
    if (log.action === 'report_deleted') {
      return t('history_actions.report_deleted_details');
    }
    if (log.action === 'report_edited' && Array.isArray(log.details)) {
        return log.details.map((change: ChangeDetail, index: number) => {
            const fieldKey = `history_fields.${change.field}`;
            const field = t(fieldKey, change.field);

            const formatValue = (value: any, field: string) => {
                if (value === null || value === undefined || value === '') return t('history_fields.empty');
                if (field === 'status' || field === 'priority') {
                    return t(`${field === 'status' ? 'statuses' : 'priorities'}.${value}`, value);
                }
                if (field === 'subViolationType' && Array.isArray(value)) {
                    return value.map(et => t(`sub_violation_types.${et}`, et)).join(', ');
                }
                if (field === 'targetDate' && value instanceof Timestamp) {
                    return format(value.toDate(), 'PPP');
                }
                 if (field === 'targetDate' && value === null) {
                   return t('history_fields.unset');
                 }
                if (typeof value === 'object' && value !== null) {
                    return JSON.stringify(value);
                }
                return `"${value}"`;
            }

            const from = formatValue(change.oldValue, change.field);
            const to = formatValue(change.newValue, change.field);
            
            let message;
            if (change.field === 'progress') {
                message = t('history_actions.progress_changed', { from: change.oldValue || 0, to: change.newValue || 0 });
            } else {
               message = t('history_actions.field_changed_from_to', { field, from: from, to: to });
            }
            return <div key={index}>{message}</div>
        });
    }
    return log.details as string;
  }, [t]);

  useEffect(() => {
    if (!reportId) return;

    setIsLoading(true);
    const historyCollectionRef = collection(db, 'history');
    const q = query(historyCollectionRef, where('reportId', '==', reportId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let logsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryLog));
      
      // Sort logs by date on the client-side
      logsData.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

      setLogs(logsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching history in real-time:", error);
      toast({ variant: 'destructive', title: t('report_dialog.fetch_history_error'), description: error.message });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [reportId, t, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (logs.length === 0) {
    return <div className="text-center text-muted-foreground p-8">{t('report_dialog.no_history')}</div>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={log.user.avatar || undefined} alt={log.user.name || 'User'} />
              <AvatarFallback>
                <HistoryIcon className="h-4 w-4 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm">
              <span className="font-semibold">{log.user.name || 'CommunityUser'}</span>{' '}
              {t(`history_actions.${log.action}`, {context: 'default_action'})}
            </p>
            {/* ✅ FIX: Replaced break-words with break-all for forced wrapping */}
            <div className="text-sm text-muted-foreground break-all pb-2">
                {generateLogMessage(log)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};


const CommentsTab = ({ reportId }: { reportId: string }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const commentForm = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: '' },
  });
  const { isSubmitting } = commentForm.formState;

  useEffect(() => {
    if (!reportId) return;
    setIsLoading(true);
    const commentsCollectionRef = collection(db, 'reports', reportId, 'comments');
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching comments in real-time:", error);
      toast({ variant: 'destructive', title: t('report_dialog.fetch_comments_error'), description: error.message });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [reportId, t, toast]);

  const onCommentSubmit = async (values: z.infer<typeof commentSchema>) => {
    if (!user || !reportId) return;
    const result = await addComment(reportId, values.comment, user.uid, user.displayName, user.email);
    if (result.success) {
      commentForm.reset();
    } else {
      toast({ variant: 'destructive', title: t('report_dialog.add_comment_error'), description: result.error });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user.avatar || undefined} alt={comment.user.name || 'User'} />
                  <AvatarFallback>{comment.user.name ? comment.user.name.substring(0, 2).toUpperCase() : 'A'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-foreground bg-muted p-2 rounded-md mt-1">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground p-8">{t('report_dialog.no_comments')}</div>
          )}
        </div>
      </ScrollArea>
      <Form {...commentForm}>
        <form onSubmit={commentForm.handleSubmit(onCommentSubmit)} className="mt-4 pt-4 border-t flex items-start gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <FormField
            control={commentForm.control}
            name="comment"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('report_dialog.add_a_comment')}
                    rows={2}
                    className="resize-none"
                    disabled={!user}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="icon" disabled={isSubmitting || !user}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </Form>
    </div>
  );
};


export function ReportActivityDialog({ isOpen, onClose, report, defaultTab = 'history' }: ReportActivityDialogProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [currentTab, setCurrentTab] = useState(defaultTab);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  const handleTabChange = (value: string) => {
    const newTab = value as 'comments' | 'history';
    setCurrentTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  if (!isMounted || !report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('report_dialog.activity_title')}</DialogTitle>
          <DialogDescription>
            {t('report_dialog.activity_description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments">
              <MessageSquare className="mr-2 h-4 w-4" />
              <div className='flex items-center gap-2'>
                {t('report_dialog.tabs.comments')}
                {typeof report.commentCount === 'number' && report.commentCount > 0 && (
                  <Badge variant="secondary">{report.commentCount}</Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon className="mr-2 h-4 w-4" />
              {t('report_dialog.tabs.history')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="flex-1 flex flex-col overflow-hidden pt-4 data-[state=inactive]:hidden">
            <CommentsTab reportId={report.id} />
          </TabsContent>
          <TabsContent value="history" className="flex-1 overflow-hidden pt-4 data-[state=inactive]:hidden">
            <ScrollArea className="h-full px-4">
              <HistoryTab reportId={report.id} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
