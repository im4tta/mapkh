
"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-provider';
import { addPost, updatePost, deletePost } from '@/app/actions';
import { CommunityPost, UserInfo } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MoreHorizontal, Pencil, Trash2, Reply, X, AtSign, MessageSquare } from 'lucide-react';
import { UserMentionInput, extractMentions, renderTextWithMentions } from '@/components/user-mention-input';
import { sendMentionNotifications, sendReplyNotification } from '@/lib/notification-utils';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

const postSchema = z.object({
  text: z.string().min(1, "Message cannot be empty.").max(500, "Message cannot be longer than 500 characters."),
});

type PostFormValues = z.infer<typeof postSchema>;

const PostItem = memo(({ post, onEdit, onReply }: { post: CommunityPost, onEdit: (post: CommunityPost) => void, onReply: (post: CommunityPost) => void }) => {
    const { user } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);
        if (!user) return;
        const result = await deletePost(post.id, user.uid);
        if (!result.success) {
            toast({ variant: 'destructive', title: "Failed to delete post", description: result.error });
        }
        setIsDeleting(false); // Close dialog via onOpenChange
    }, [post.id, user, toast]);

    const formattedDate = useMemo(() => {
        return post.createdAt ? formatDistanceToNow(new Date(post.createdAt as any), { addSuffix: true }) : '';
    }, [post.createdAt]);

    return (
        <div className="group flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-background/50 to-muted/20 border border-border/30 hover:border-border/50 transition-all duration-200 hover:shadow-md backdrop-blur-sm">
            <Avatar className="ring-2 ring-primary/10 hover:ring-primary/20 transition-all duration-200">
                <AvatarImage src={post.user.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {post.user.name?.charAt(0) || 'U'}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-foreground">{post.user.name}</span>
                    <span className="text-xs text-muted-foreground/70 bg-muted/50 px-2 py-1 rounded-full">
                        {formattedDate}
                        {post.updatedAt && " (edited)"}
                    </span>
                </div>
                
                 {post.replyTo && (
                    <div className="text-xs bg-gradient-to-r from-muted/40 to-muted/20 p-2 rounded-lg mt-2 mb-3 border-l-3 border-primary/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Reply className="h-3 w-3 text-primary" />
                            <p className="font-semibold text-primary">Replying to {post.replyTo.user.name}</p>
                        </div>
                        <p className="line-clamp-2 text-muted-foreground">{post.replyTo.text}</p>
                    </div>
                )}
                
                <div className="text-sm text-foreground bg-gradient-to-r from-muted/30 to-muted/10 p-3 rounded-lg border border-border/20 whitespace-pre-wrap leading-relaxed">
                    {renderTextWithMentions(post.text)}
                </div>
            </div>
            {user && (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted/50 rounded-lg"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-md border-border/50">
                            <DropdownMenuItem 
                                onClick={() => onReply(post)}
                                className="flex items-center gap-2 hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
                            >
                                <Reply className="h-4 w-4 text-primary" />
                                Reply
                            </DropdownMenuItem>
                            {user.uid === post.user.uid && (
                                <>
                                    <DropdownMenuItem 
                                        onClick={() => onEdit(post)}
                                        className="flex items-center gap-2 hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
                                    >
                                        <Pencil className="h-4 w-4 text-primary" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => setIsDeleting(true)}
                                        className="flex items-center gap-2 hover:bg-destructive/10 focus:bg-destructive/10 text-destructive cursor-pointer"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                        <AlertDialogContent className="bg-background/95 backdrop-blur-md border-border/50">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-lg font-semibold">Delete Message</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                    Are you sure you want to delete this message? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="hover:bg-muted/50">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={handleDelete}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </div>
    );
});

PostItem.displayName = 'PostItem';

export function CommunityTalk() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [replyingTo, setReplyingTo] = useState<CommunityPost | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<UserInfo[]>([]);
  const [optimisticTempId, setOptimisticTempId] = useState<string | null>(null);
  const [isNearTop, setIsNearTop] = useState(true);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { text: "" },
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (editingPost) {
        form.setValue('text', editingPost.text);
    } else {
        form.reset({ text: "" });
    }
  }, [editingPost, form]);
  
  const handleReply = useCallback((post: CommunityPost) => {
    setEditingPost(null); // Cancel any ongoing edit
    setReplyingTo(post);
    textareaRef.current?.focus();
  }, []);
  
  const cancelReply = useCallback(() => {
      setReplyingTo(null);
  }, []);

  // Smoothly scroll to the latest message (top, since list is desc)
  const scrollToLatest = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    if (!isFirebaseConfigured) {
      // Graceful offline: no subscription, show empty state
      setPosts([]);
      setIsLoading(false);
      return;
    }
    // Reduce limit for better mobile performance
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as any).toDate(),
            updatedAt: (data.updatedAt as any)?.toDate(),
        } as CommunityPost;
      });
      // Remove any optimistic temp post if snapshot includes real data
      setPosts(prev => {
        const withoutTemp = optimisticTempId ? prev.filter(p => p.id !== optimisticTempId) : prev;
        const merged = postsData;
        return merged;
      });
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      toast({ variant: 'destructive', title: t('contributions.talk.fetch_error') });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, t, optimisticTempId]);

  // Track whether user is near the top (latest)
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 20;
      const atTop = el.scrollTop <= threshold;
      setIsNearTop(atTop);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  
  // Auto-scroll to latest on new data
  useEffect(() => {
    const timeoutId = setTimeout(scrollToLatest, 100);
    return () => clearTimeout(timeoutId);
  }, [posts, scrollToLatest]);

  const onSubmit = useCallback(async (data: PostFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: t('contributions.talk.auth_error') });
      return;
    }
    if (!isFirebaseConfigured) {
      toast({ variant: 'destructive', title: t('contributions.talk.fetch_error'), description: 'Realtime chat is disabled. Configure Firebase to send messages.' });
      return;
    }
    
    // Extract mentions from the post text
    const mentions = extractMentions(data.text);
    
    let result;
    let tempId: string | null = null;
    if (editingPost) {
        result = await updatePost(editingPost.id, data.text, user.uid);
    } else {
        // Optimistic UI: add a temporary post at the top
        tempId = `temp-${Date.now()}`;
        const tempPost: CommunityPost = {
          id: tempId,
          text: data.text,
          user: {
            uid: user.uid,
            name: user.displayName || user.email || 'Anonymous',
            avatar: user.photoURL || null,
            email: user.email || null,
          },
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: undefined,
          replyTo: replyingTo || undefined,
          mentions,
        } as unknown as CommunityPost;
        setPosts(prev => [tempPost, ...prev]);
        setOptimisticTempId(tempId);
        result = await addPost(data.text, user.uid, user.displayName, replyingTo, mentions);
    }

    if (result.success) {
        // Send notifications to mentioned users (only for new posts, not edits)
        if (!editingPost && mentions.length > 0) {
          const addResult = result as { success: boolean; data?: { id: string }; error?: string };
          if (addResult.data) {
            await sendMentionNotifications(mentions, addResult.data.id, data.text, {
              uid: user.uid,
              name: user.displayName || user.email || 'Anonymous',
              avatar: user.photoURL,
              email: user.email
            });
          }
        }
        
        // Send reply notification if this is a reply (only for new posts, not edits)
        if (!editingPost && replyingTo) {
          await sendReplyNotification(
            replyingTo.user.uid,
            data.text,
            {
              uid: user.uid,
              name: user.displayName || user.email || 'Anonymous',
              avatar: user.photoURL,
              email: user.email
            },
            replyingTo.id
          );
        }
        
        form.reset();
        setEditingPost(null);
        setReplyingTo(null);
        setMentionedUsers([]);
        // Remove temp post once server acknowledges
        if (tempId) {
          setPosts(prev => prev.filter(p => p.id !== tempId));
          setOptimisticTempId(null);
        }
      } else {
      toast({ variant: 'destructive', title: t('contributions.talk.send_error_title'), description: result.error });
      // Rollback optimistic temp on error
      if (tempId) {
        setPosts(prev => prev.filter(p => p.id !== tempId));
        setOptimisticTempId(null);
      }
    }
  }, [user, editingPost, replyingTo, form, toast, t]);

  // Memoize rendered posts to prevent unnecessary re-renders
  const renderedPosts = useMemo(() => {
    return posts.map((post) => (
      <PostItem key={post.id} post={post} onEdit={setEditingPost} onReply={handleReply} />
    ));
  }, [posts, handleReply]);

  return (
    <Card className="h-full flex flex-col flex-1 bg-gradient-to-br from-background via-background to-muted/20 border-border/50 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {t('contributions.talk.title')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground/80">
              {t('contributions.talk.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {/* Messages Container */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            className="h-full overflow-y-auto overflow-x-hidden px-5 py-3 scroll-smooth"
            ref={scrollAreaRef}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--primary) / 0.3) transparent'
            }}
          >
            <div className="space-y-3 min-h-full">
              {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
              ) : posts.length > 0 ? (
                <div className="space-y-3">
                  {renderedPosts}
                </div>
              ) : (
                  <div className="flex-1 flex items-center justify-center min-h-[300px]">
                    <div className="text-center space-y-4 animate-fade-in">
                      <div className="h-20 w-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                        <MessageSquare className="h-10 w-10 text-primary/70" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-foreground">Start the conversation</p>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                          {t('contributions.talk.no_messages')}
                        </p>
                      </div>
                    </div>
                  </div>
              )}
            </div>
          </div>
          {!isNearTop && posts.length > 0 && (
            <div className="absolute bottom-6 right-6">
              <Button
                variant="secondary"
                className="rounded-full shadow-md bg-background/80 backdrop-blur-md border border-border/40 hover:bg-primary/10"
                onClick={scrollToLatest}
              >
                Jump to latest
              </Button>
            </div>
          )}
        </div>
        
        {/* Input Form */}
        <div className="border-t border-border/30 bg-gradient-to-r from-muted/20 via-background to-muted/20 p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
              <Avatar className="mt-1 h-9 w-9 ring-2 ring-primary/10">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {user?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                 {(editingPost || replyingTo) && (
                    <div className="text-xs bg-gradient-to-r from-muted/50 to-muted/30 p-3 rounded-xl border border-border/30 flex justify-between items-center backdrop-blur-sm">
                        {editingPost ? (
                             <div className="flex items-center gap-2">
                               <Pencil className="h-3 w-3 text-primary" />
                               <p className="text-muted-foreground font-medium">Editing message...</p>
                             </div>
                        ) : (
                            <div className="flex items-center gap-2">
                              <Reply className="h-3 w-3 text-primary" />
                              <p className="text-muted-foreground font-medium line-clamp-1">
                                Replying to {replyingTo?.user.name}
                              </p>
                            </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive transition-colors" 
                          onClick={() => { setEditingPost(null); setReplyingTo(null); }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <UserMentionInput
                            value={field.value}
                            onChange={field.onChange}
                            onMention={(user) => {
                              setMentionedUsers(prev => [...prev, user]);
                            }}
                            placeholder={t('contributions.talk.placeholder')}
                            className="resize-none border-border/50 rounded-xl p-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 bg-background/60 backdrop-blur-sm transition-all duration-200 hover:border-primary/30"
                            disabled={isSubmitting || authLoading}
                            onEnterToSend={() => form.handleSubmit(onSubmit)()}
                            autoFocus
                            rows={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                disabled={isSubmitting || authLoading}
                className="mt-1 h-9 w-9 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
