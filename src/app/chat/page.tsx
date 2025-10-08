"use client";

import { ChatRoom } from '@/components/chat/chat-room';
import { AuthLoader } from '@/context/auth-provider';

export default function ChatPage() {
  return (
    <AuthLoader>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-[calc(100vh-120px)]">
                <ChatRoom />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLoader>
  );
}