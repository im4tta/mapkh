"use client";

import { useEffect, useRef, useState } from 'react';
import { subscribeMessages } from '@/lib/chat';
import { updateMessageTranslations } from '@/lib/chat';
import type { ChatMessage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { Edit, Save, X, Languages, Reply } from 'lucide-react';

interface MessageListProps {
  teamId: string;
  channelId: string;
  onReply?: (message: ChatMessage) => void;
}

export function MessageList({ teamId, channelId, onReply }: MessageListProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTextKhmer, setEditTextKhmer] = useState('');
  const [editTextEnglish, setEditTextEnglish] = useState('');
  const [activeLanguage, setActiveLanguage] = useState<'original' | 'khmer' | 'english'>('original');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = subscribeMessages(teamId, channelId, setMessages, { pageSize: 500 });
    return () => unsub();
  }, [teamId, channelId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleEditStart = (message: ChatMessage) => {
    setEditingMessage(message.id);
    setEditText(message.text);
    setEditTextKhmer(message.textKhmer || '');
    setEditTextEnglish(message.textEnglish || '');
  };

  const handleEditCancel = () => {
    setEditingMessage(null);
    setEditText('');
    setEditTextKhmer('');
    setEditTextEnglish('');
  };

  const handleEditSave = async (messageId: string) => {
    try {
      await updateMessageTranslations({
        teamId,
        channelId,
        messageId,
        text: editText,
        textKhmer: editTextKhmer,
        textEnglish: editTextEnglish,
      });
      
      handleEditCancel();
    } catch (error) {
      console.error('Failed to save message translations:', error);
    }
  };

  const getDisplayText = (message: ChatMessage) => {
    switch (activeLanguage) {
      case 'khmer':
        return message.textKhmer || message.text;
      case 'english':
        return message.textEnglish || message.text;
      default:
        return message.text;
    }
  };

  const hasTranslations = (message: ChatMessage) => {
    return message.textKhmer || message.textEnglish;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Languages className="h-5 w-5" />
          <span className="font-medium">Language View:</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeLanguage === 'original' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveLanguage('original')}
            className={activeLanguage === 'original' ? 'bg-blue-500 hover:bg-blue-600' : ''}
          >
            Original
          </Button>
          <Button
            variant={activeLanguage === 'khmer' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveLanguage('khmer')}
            className={activeLanguage === 'khmer' ? 'bg-blue-500 hover:bg-blue-600' : ''}
          >
            ខ្មែរ
          </Button>
          <Button
            variant={activeLanguage === 'english' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveLanguage('english')}
            className={activeLanguage === 'english' ? 'bg-blue-500 hover:bg-blue-600' : ''}
          >
            English
          </Button>
        </div>
      </div>

      {messages.map((m) => (
        <div key={m.id} className="group">
          <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <Avatar className="h-10 w-10 ring-2 ring-blue-100 dark:ring-blue-900">
              <AvatarImage src={m.userAvatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                {m.userName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{m.userName || 'Unknown'}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {(
                    (() => {
                      const d = typeof m.createdAt === 'string'
                        ? new Date(m.createdAt)
                        : (m.createdAt as Timestamp).toDate();
                      return d.toLocaleString();
                    })()
                  )}
                </span>
                {hasTranslations(m) && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Languages className="h-3 w-3 mr-1" />
                    Translated
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-50 dark:hover:bg-green-900/20"
                  onClick={() => onReply?.(m)}
                >
                  <Reply className="h-4 w-4 text-green-600 dark:text-green-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => handleEditStart(m)}
                >
                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </Button>
              </div>

              {/* Reply indicator */}
              {m.replyTo && (
                <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border-l-2 border-blue-500">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Replying to <span className="font-medium">{m.replyTo.userName}</span>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {m.replyTo.text}
                  </div>
                </div>
              )}

            {editingMessage === m.id ? (
              <div className="mt-3 space-y-4 p-4 border-2 border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Original Text</label>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Khmer Translation</label>
                  <Textarea
                    value={editTextKhmer}
                    onChange={(e) => setEditTextKhmer(e.target.value)}
                    className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add Khmer translation..."
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">English Translation</label>
                  <Textarea
                    value={editTextEnglish}
                    onChange={(e) => setEditTextEnglish(e.target.value)}
                    className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add English translation..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditSave(m.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditCancel}
                    className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap leading-relaxed">
                {getDisplayText(m)}
              </div>
            )}
          </div>
        </div>
      </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}