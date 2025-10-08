import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type Unsubscribe
} from 'firebase/firestore';
import type { ChatMessage, ChatChannel, ChatTeam, ChatPresence } from './types';

// Paths: teams/{teamId}/channels/{channelId}/messages
// Presence: teams/{teamId}/presence/{userId}

export async function ensureDefaultTeamAndChannel(): Promise<{ team: ChatTeam; channel: ChatChannel }>{
  const teamId = 'global';
  const channelId = 'general';

  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) {
    await setDoc(teamRef, {
      name: 'Global Team',
      createdAt: serverTimestamp(),
      avatar: '/icons/favicon.png'
    });
  }

  const channelRef = doc(db, `teams/${teamId}/channels`, channelId);
  const channelSnap = await getDoc(channelRef);
  if (!channelSnap.exists()) {
    await setDoc(channelRef, {
      name: 'general',
      topic: 'Team-wide announcements and casual chat',
      createdAt: serverTimestamp(),
      isPrivate: false
    });
  }

  const team: ChatTeam = {
    id: teamId,
    name: (teamSnap.data()?.name as string) || 'Global Team',
    avatar: teamSnap.data()?.avatar || '/icons/favicon.png',
    createdAt: (teamSnap.data()?.createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
  };

  const channel: ChatChannel = {
    id: channelId,
    teamId,
    name: (channelSnap.data()?.name as string) || 'general',
    topic: channelSnap.data()?.topic || '',
    isPrivate: channelSnap.data()?.isPrivate || false,
    createdAt: (channelSnap.data()?.createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
  };

  return { team, channel };
}

export function subscribeMessages(
  teamId: string,
  channelId: string,
  onMessages: (messages: ChatMessage[]) => void,
  opts?: { pageSize?: number }
): Unsubscribe {
  const pageSize = opts?.pageSize ?? 200;
  const messagesRef = collection(db, `teams/${teamId}/channels/${channelId}/messages`);
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(pageSize));
  return onSnapshot(q, (snapshot) => {
    const list: ChatMessage[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        teamId,
        channelId,
        userId: d.userId,
        userName: d.userName ?? null,
        userAvatar: d.userAvatar ?? null,
        text: d.text ?? '',
        textKhmer: d.textKhmer ?? undefined,
        textEnglish: d.textEnglish ?? undefined,
        attachments: d.attachments ?? [],
        mentions: d.mentions ?? [],
        reactions: d.reactions ?? {},
        replyTo: d.replyTo ?? undefined,
        createdAt: (d.createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
        editedAt: d.editedAt ? ((d.editedAt as Timestamp)?.toDate()?.toISOString() || d.editedAt) : undefined,
        clientMessageId: d.clientMessageId,
      } as ChatMessage;
    });
    onMessages(list);
  });
}

export async function updateMessageTranslations(params: {
  teamId: string;
  channelId: string;
  messageId: string;
  text?: string;
  textKhmer?: string;
  textEnglish?: string;
}): Promise<void> {
  const { teamId, channelId, messageId, text, textKhmer, textEnglish } = params;
  const messageRef = doc(db, `teams/${teamId}/channels/${channelId}/messages`, messageId);
  
  const updateData: any = {
    editedAt: serverTimestamp(),
  };
  
  if (text !== undefined) updateData.text = text;
  if (textKhmer !== undefined) updateData.textKhmer = textKhmer;
  if (textEnglish !== undefined) updateData.textEnglish = textEnglish;
  
  await updateDoc(messageRef, updateData);
}

export async function sendMessage(params: {
  teamId: string;
  channelId: string;
  userId: string;
  userName?: string | null;
  userAvatar?: string | null;
  text: string;
  clientMessageId?: string;
  replyTo?: {
    messageId: string;
    userId: string;
    userName?: string | null;
    text: string;
  };
}): Promise<void> {
  const { teamId, channelId, userId, userName, userAvatar, text, clientMessageId, replyTo } = params;
  if (!text.trim()) return;
  const messagesRef = collection(db, `teams/${teamId}/channels/${channelId}/messages`);
  
  const messageData: any = {
    userId,
    userName: userName ?? null,
    userAvatar: userAvatar ?? null,
    text,
    createdAt: serverTimestamp(),
    clientMessageId: clientMessageId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  
  if (replyTo) {
    messageData.replyTo = replyTo;
  }
  
  await addDoc(messagesRef, messageData);
}

export async function setTypingPresence(teamId: string, userId: string, channelId: string | null) {
  const presenceRef = doc(db, `teams/${teamId}/presence`, userId);
  await setDoc(presenceRef, {
    status: 'online',
    lastActiveAt: serverTimestamp(),
    typingIn: channelId ? { channelId, since: serverTimestamp() } : null,
  }, { merge: true });
}

export function subscribePresence(teamId: string, onPresence: (map: Record<string, ChatPresence>) => void): Unsubscribe {
  const presenceRef = collection(db, `teams/${teamId}/presence`);
  return onSnapshot(presenceRef, (snapshot) => {
    const map: Record<string, ChatPresence> = {};
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      map[docSnap.id] = {
        userId: docSnap.id,
        teamId,
        status: d.status ?? 'online',
        lastActiveAt: (d.lastActiveAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
        typingIn: d.typingIn ?? null,
      };
    });
    onPresence(map);
  });
}