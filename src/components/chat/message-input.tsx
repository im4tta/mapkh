"use client";

import { useEffect, useState } from 'react';
import { sendMessage, setTypingPresence } from '@/lib/chat';
import { useAuth } from '@/context/auth-provider';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

interface MessageInputProps {
  teamId: string;
  channelId: string;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

export function MessageInput({ teamId, channelId, replyTo, onCancelReply }: MessageInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Clear typing if idle
      if (user?.uid) setTypingPresence(teamId, user.uid, null);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [text, teamId, user?.uid]);

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!user?.uid) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await onSend();
    } else {
      await setTypingPresence(teamId, user.uid, channelId);
    }
  };

  const onSend = async () => {
    if (!user?.uid || !text.trim()) return;
    try {
      setSending(true);
      await sendMessage({
        teamId,
        channelId,
        userId: user.uid,
        userName: user.displayName || user.email,
        userAvatar: user.photoURL,
        text: text.trim(),
        replyTo: replyTo ? {
          messageId: replyTo.id,
          userId: replyTo.userId,
          userName: replyTo.userName,
          text: replyTo.text
        } : undefined,
      });
      setText('');
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      {/* Reply indicator */}
      {replyTo && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Replying to {replyTo.userName}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {replyTo.text}
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
            placeholder={replyTo ? `Reply to ${replyTo.userName}...` : `Message #${channelId}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!user}
          />
        </div>
        <Button 
          onClick={onSend} 
          disabled={!user || sending || !text.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}