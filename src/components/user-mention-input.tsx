"use client";

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserInfo } from '@/lib/types';
import { getUsers } from '@/app/actions';

interface UserMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (user: UserInfo) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface MentionUser {
  uid: string;
  name: string;
  avatar: string | null;
  email?: string | null;
}

export const UserMentionInput = forwardRef<HTMLTextAreaElement, UserMentionInputProps>(
  ({ value, onChange, onMention, placeholder, className, disabled }, ref) => {
    const [users, setUsers] = useState<MentionUser[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 });
    const [filteredUsers, setFilteredUsers] = useState<MentionUser[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load users on component mount
    useEffect(() => {
      const loadUsers = async () => {
        try {
          const result = await getUsers();
          if (result.success && result.data) {
            const mentionUsers = result.data.map(user => ({
              uid: user.uid,
              name: user.name || user.email || 'Anonymous',
              avatar: user.avatar,
              email: user.email
            }));
            setUsers(mentionUsers);
          }
        } catch (error) {
          console.error('Error loading users for mentions:', error);
        }
      };
      loadUsers();
    }, []);

    // Handle text change and detect @ mentions
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart;
      
      onChange(newValue);

      // Check for @ symbol before cursor
      const textBeforeCursor = newValue.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        
        // Check if there's a space after @ (which would end the mention)
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setMentionQuery(textAfterAt);
          setMentionPosition({ start: lastAtIndex, end: cursorPosition });
          setShowMentions(true);
          setSelectedIndex(0);
          
          // Filter users based on query
          const filtered = users.filter(user =>
            user.name.toLowerCase().includes(textAfterAt.toLowerCase()) ||
            (user.email && user.email.toLowerCase().includes(textAfterAt.toLowerCase()))
          ).slice(0, 5); // Limit to 5 results
          
          setFilteredUsers(filtered);
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    };

    // Handle user selection from mention dropdown
    const handleUserSelect = (user: MentionUser) => {
      const beforeMention = value.substring(0, mentionPosition.start);
      const afterMention = value.substring(mentionPosition.end);
      const newValue = `${beforeMention}@${user.name} ${afterMention}`;
      
      onChange(newValue);
      setShowMentions(false);
      
      // Call onMention callback if provided
      if (onMention) {
        onMention({
          uid: user.uid,
          name: user.name,
          avatar: user.avatar,
          email: user.email
        });
      }

      // Focus back to textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPosition = beforeMention.length + user.name.length + 2; // +2 for @ and space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    };

    // Handle key events for mention navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showMentions && filteredUsers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          handleUserSelect(filteredUsers[selectedIndex]);
        } else if (e.key === 'Escape') {
          setShowMentions(false);
          e.preventDefault();
        }
      }
    };

    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          rows={3}
        />
        
        {showMentions && filteredUsers.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-80 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            <div className="p-2 text-sm text-gray-500 border-b">Mention User</div>
            {filteredUsers.map((user, index) => (
              <div
                key={user.uid}
                onClick={() => handleUserSelect(user)}
                className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 ${
                  index === selectedIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                }`}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  {user.email && (
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

UserMentionInput.displayName = 'UserMentionInput';

// Utility function to extract mentions from text
export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

// Utility function to render text with highlighted mentions
export const renderTextWithMentions = (text: string) => {
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add highlighted mention
    parts.push(
      <span key={match.index} className="bg-blue-100 text-blue-800 px-1 rounded font-medium">
        @{match[1]}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
};