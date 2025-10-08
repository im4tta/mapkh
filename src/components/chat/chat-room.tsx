"use client";

import { useEffect, useState } from 'react';
import { ensureDefaultTeamAndChannel, subscribePresence } from '@/lib/chat';
import type { ChatPresence, ChatChannel, ChatTeam, ChatMessage } from '@/lib/types';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Badge } from '@/components/ui/badge';

export function ChatRoom() {
  const [team, setTeam] = useState<ChatTeam | null>(null);
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [presence, setPresence] = useState<Record<string, ChatPresence>>({});
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  useEffect(() => {
    (async () => {
      const { team, channel } = await ensureDefaultTeamAndChannel();
      setTeam(team);
      setChannel(channel);
    })();
  }, []);

  useEffect(() => {
    if (!team) return;
    const unsub = subscribePresence(team.id, setPresence);
    return () => unsub();
  }, [team?.id]);

  if (!team || !channel) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading chat…</div>
    );
  }

  const typingUsers = Object.values(presence)
    .filter(p => p.typingIn?.channelId === channel.id)
    .map(p => p.userId);

  const handleReply = (message: ChatMessage) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="font-semibold text-lg">#{channel.name}</div>
          </div>
          {channel.topic && (
            <div className="text-sm text-blue-100 opacity-90">{channel.topic}</div>
          )}
          {typingUsers.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs bg-white/20 text-white border-white/30">
              {typingUsers.length === 1 ? 'Someone is typing…' : `${typingUsers.length} typing…`}
            </Badge>
          )}
        </div>
      </div>
      <MessageList teamId={team.id} channelId={channel.id} onReply={handleReply} />
      <MessageInput teamId={team.id} channelId={channel.id} replyTo={replyTo} onCancelReply={handleCancelReply} />
    </div>
  );
}