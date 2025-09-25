
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
import { CommunityPost } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MoreHorizontal, Pencil, Trash2, Reply, X } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
        <div className="group flex items-start gap-3">
            <Avatar>
                <AvatarImage src={post.user.avatar || undefined} />
                <AvatarFallback>{post.user.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{post.user.name}</span>
                    <span className="text-xs text-muted-foreground">
                        {formattedDate}
                        {post.updatedAt && " (edited)"}
                    </span>
                </div>
                
                 {post.replyTo && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md mt-1 border-l-2 border-primary">
                        <p className="font-semibold">Replying to {post.replyTo.user.name}</p>
                        <p className="line-clamp-1">{post.replyTo.text}</p>
                    </div>
                )}
                
                <p className="text-sm text-foreground bg-muted p-2 rounded-md mt-1 whitespace-pre-wrap">{post.text}</p>
            </div>
            {user && (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                             <DropdownMenuItem onClick={() => onReply(post)}>
                                <Reply className="mr-2 h-4 w-4" /> Reply
                            </DropdownMenuItem>
                            {user.uid === post.user.uid && (
                                <>
                                    <DropdownMenuItem onClick={() => onEdit(post)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsDeleting(true)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete your message.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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

  // Debounced scroll to bottom to reduce excessive scrolling on Android
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
        const scrollableView = scrollAreaRef.current.querySelector('div');
        if (scrollableView) {
            // Use requestAnimationFrame for smoother scrolling on mobile
            requestAnimationFrame(() => {
                scrollableView.scrollTop = scrollableView.scrollHeight;
            });
        }
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    // Reduce limit for better mobile performance
    const q = query(collection(db, "posts"), orderBy("createdAt", "asc"), limit(30));
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
      setPosts(postsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      toast({ variant: 'destructive', title: t('contributions.talk.fetch_error') });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, t]);
  
  // Debounce scroll to bottom to improve performance
  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [posts, scrollToBottom]);

  const onSubmit = useCallback(async (data: PostFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: t('contributions.talk.auth_error') });
      return;
    }
    
    let result;
    if (editingPost) {
        result = await updatePost(editingPost.id, data.text, user.uid);
    } else {
        result = await addPost(data.text, user.uid, user.displayName, replyingTo);
    }

    if (result.success) {
      form.reset();
      setEditingPost(null);
      setReplyingTo(null);
    } else {
      toast({ variant: 'destructive', title: t('contributions.talk.send_error_title'), description: result.error });
    }
  }, [user, editingPost, replyingTo, form, toast, t]);

  // Memoize rendered posts to prevent unnecessary re-renders
  const renderedPosts = useMemo(() => {
    return posts.map((post) => (
      <PostItem key={post.id} post={post} onEdit={setEditingPost} onReply={handleReply} />
    ));
  }, [posts, handleReply]);

  return (
    <Card className="h-full flex flex-col flex-1">
      <CardHeader>
        <CardTitle>{t('contributions.talk.title')}</CardTitle>
        <CardDescription>{t('contributions.talk.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {isLoading ? (
                <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </>
            ) : posts.length > 0 ? (
              renderedPosts
            ) : (
                <div className="text-center text-muted-foreground p-8">{t('contributions.talk.no_messages')}</div>
            )}
          </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
              <Avatar className="mt-1">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                 {(editingPost || replyingTo) && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md flex justify-between items-center">
                        {editingPost ? (
                             <p>Editing message...</p>
                        ) : (
                            <p className="line-clamp-1">Replying to {replyingTo?.user.name}</p>
                        )}
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingPost(null); setReplyingTo(null); }}>
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
                          <Textarea
                            placeholder={t('contributions.talk.placeholder')}
                            className="resize-none"
                            rows={2}
                            disabled={isSubmitting || authLoading}
                            {...field}
                            ref={textareaRef}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <Button type="submit" size="icon" disabled={isSubmitting || authLoading}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
