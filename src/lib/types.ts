import { type LucideIcon, HelpCircle, MapPinOff, TextCursorInput, AlertCircle, Waypoints, Gauge, Bus, Building2, Map, PenSquare, Milestone, User, MessageSquare, CheckCircle2, FilePlus2, Star, CheckSquare, Target, BookOpen, Info, Folder, Edit, ShieldCheck, Award, ThumbsUp, File as FileIcon, Archive, Trophy, AtSign, Reply } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export type UserInfo = {
  uid: string;
  name: string | null;
  avatar: string | null;
  email?: string | null;
  lastLogin?: string | null;
}

export type ChangeDetail = {
  field: string;
  oldValue: any;
  newValue: any;
};


export type HistoryLog = {
  id: string;
  reportId?: string; // Optional, for report-specific history
  entityId: string; // The ID of the item that was changed (report, user, team, etc.)
  entityType: 'report' | 'user' | 'team' | 'post' | 'tip' | 'comment' | 'file' | 'folder' | 'url_saved';
  user: UserInfo;
  action: string;
  details: string | ChangeDetail[];
  createdAt: Timestamp;
};

export type ViolationTerm = {
  id: string;
  name: string;
  createdAt: Timestamp;
};

export type PlaceType = {
  id: string;
  name: string;
  createdAt: Timestamp;
};


export const provinces = [
    "Banteay Meanchey", "Battambang", "Kampong Cham", "Kampong Chhnang",
    "Kampong Speu", "Kampong Thom", "Kampot", "Kandal", "Kep", "Koh Kong",
    "Kratie", "Mondulkiri", "Oddar Meanchey", "Pailin", "Phnom Penh",
    "Preah Sihanouk", "Preah Vihear", "Prey Veng", "Pursat", "Ratanakiri",
    "Siem Reap", "Stung Treng", "Svay Rieng", "Takeo", "Tboung Khmum"
] as const;
export type Province = typeof provinces[number];


export type Report = {
  id: string;
  reportNumber: number;
  subViolationType: string[]; // Now always an array of sub-violation IDs
  otherSubViolationType?: string;
  description: string;
  province: string; 
  placeId?: string; 
  position: {
    lat: number;
    lng: number;
  };
  impactCategory?: string; 
  violationTerm?: string; 
  status: 'not-submitted' | 'submitted' | 'in-review' | 'pending' | 'approved' | 'rejected' | 'archived';
  priority?: 'low' | 'medium' | 'high';
  createdAt: Timestamp | string;
  resolvedAt?: Timestamp | string;
  keywords?: string[];
  englishLanguage?: string;
  nativeKhmerLanguage?: string;
  thaiLanguage?: string;
  locationWithin?: string;
  reportedBy?: string; 
  reportedByName?: string;
  submittedBy?: string; 
  targetDate?: Timestamp | string;
  progress?: number;
  notes?: string;
  driveLink?: string;
  folderId?: string; 
  verifications?: string[];
  commentCount?: number;
  
  // Data protection and review system fields
  editStatus?: 'none' | 'pending-review' | 'approved' | 'rejected';
  pendingChanges?: {
    changes: Record<string, any>;
    requestedBy: string;
    requestedByName: string;
    requestedAt: Timestamp | string;
    reason?: string;
  };
  lastApprovedBy?: string;
  lastApprovedByName?: string;
  lastApprovedAt?: Timestamp | string;
  editHistory?: {
    id: string;
    changes: Record<string, any>;
    requestedBy: string;
    requestedByName: string;
    requestedAt: Timestamp | string;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewedAt?: Timestamp | string;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
    adminNotes?: string;
  }[];
  isProtected?: boolean; // Prevents deletion
  protectedReason?: string;
}

export type SubViolationType = {
  id: string;
  label: string;
  description?: string;
  icon: string;
  violationTermId: string; // ID of the parent ViolationTerm
  createdAt?: Timestamp;
};

export type Team = {
    id: string;
    name: string;
    members: UserInfo[];
    provinces: Province[];
    goal: string;
    targetDate?: Timestamp | string;
    createdBy: UserInfo;
    createdAt: Timestamp | string;
}

export const iconMap: Record<string, LucideIcon> = {
    MapPinOff, Milestone, TextCursorInput, Waypoints, Gauge, Building2, Bus, Map, PenSquare, AlertCircle, MessageSquare
};

export type ErrorTypeId = string | 'all'; // 'all' is used for filtering

export type Comment = {
  id: string;
  text: string;
  user: {
    uid: string;
    name: string | null;
    avatar: string | null;
  };
  createdAt: Timestamp;
  reportId: string;
};


export const NOTIFICATION_TYPES = {
  new_user: { icon: User, color: 'text-green-500' },
  new_report: { icon: FilePlus2, color: 'text-blue-500' },
  report_edited: { icon: Edit, color: 'text-orange-500' },
  status_change: { icon: CheckCircle2, color: 'text-yellow-500' },
  comment: { icon: MessageSquare, color: 'text-purple-500' },
  new_badge: { icon: Award, color: 'text-yellow-500' },
  verification: { icon: ThumbsUp, color: 'text-green-500' },
  archived: { icon: Archive, color: 'text-gray-500'},
  mention: { icon: AtSign, color: 'text-blue-600' },
  reply: { icon: Reply, color: 'text-indigo-500' },
  edit_request: { icon: ShieldCheck, color: 'text-amber-500' },
  edit_approved: { icon: CheckCircle2, color: 'text-green-600' },
  edit_rejected: { icon: AlertCircle, color: 'text-red-500' },
} as const;

export type Notification = {
  id: string;
  userId: string | null; // Null for community-wide notifications
  type: keyof typeof NOTIFICATION_TYPES;
  title: string;
  message: string;
  reportId: string;
  reportDetails: string; // Stored as a JSON string
  read: boolean;
  createdAt: Timestamp;
  dismissedBy?: string[]; // Array of user UIDs who have dismissed this notification
};

export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  avatar: string | null;
  reports: number;
  score: number;
  approvedReports?: number;
  verifications?: number;
  recentActivity?: number; // Reports in last 30 days
};

export type CommunityPost = {
  id: string;
  text: string;
  user: UserInfo;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  replyTo?: {
    id: string;
    text: string;
    user: UserInfo;
  } | null;
  mentions?: string[]; // Array of mentioned user names
};

export const tipIcons = {
    Star,
    CheckSquare,
    Target,
    BookOpen,
    Info,
    HelpCircle,
};

export type TipIcon = keyof typeof tipIcons;

export type Tip = {
    id: string;
    title: string;
    content: string;
    icon: TipIcon;
    createdBy: UserInfo;
    createdAt: Timestamp;
};

// Gamification Types
export type BadgeId = 
    | 'first_report'
    | 'ten_reports'
    | 'fifty_reports'
    | 'first_approved'
    | 'ten_approved'
    | 'road_warrior'
    | 'city_planner'
    | 'top_contributor';

export type Badge = {
    id: BadgeId;
    name: string;
    description: string;
    icon: LucideIcon;
}

export const badges: Record<BadgeId, Omit<Badge, 'icon'>> = {
    first_report: { id: 'first_report', name: 'First Report', description: 'Submitted your very first report.' },
    ten_reports: { id: 'ten_reports', name: 'Dedicated Mapper', description: 'Submitted 10 reports.' },
    fifty_reports: { id: 'fifty_reports', name: 'Veteran Mapper', description: 'Submitted 50 reports.' },
    first_approved: { id: 'first_approved', name: 'Verified Contributor', description: 'Your first report was approved.' },
    ten_approved: { id: 'ten_approved', name: 'Trusted Mapper', description: '10 of your reports have been approved.' },
    road_warrior: { id: 'road_warrior', name: 'Road Warrior', description: 'Submitted 5 "Missing Road" reports.' },
    city_planner: { id: 'city_planner', name: 'City Planner', description: 'Submitted 5 "Missing Place" reports.' },
    top_contributor: { id: 'top_contributor', name: 'Top Contributor', description: 'Reached the #1 spot on the leaderboard.' },
};

// Chat system types
export type ChatTeam = {
  id: string;
  name: string;
  avatar?: string;
  createdAt: Timestamp | string;
};

export type ChatChannel = {
  id: string;
  teamId: string;
  name: string; // e.g., general, design, dev
  topic?: string;
  isPrivate?: boolean;
  memberIds?: string[]; // for private channels
  createdAt: Timestamp | string;
};

export type ChatMessage = {
  id: string;
  teamId: string;
  channelId: string;
  userId: string;
  userName?: string | null;
  userAvatar?: string | null;
  text: string;
  textKhmer?: string; // Khmer translation
  textEnglish?: string; // English translation
  attachments?: Array<{ id: string; name: string; url: string; type: string; size?: number }>;
  mentions?: string[]; // userIds
  reactions?: Record<string, string[]>; // emoji -> userIds
  replyTo?: {
    messageId: string;
    userId: string;
    userName?: string | null;
    text: string;
  }; // Reply information
  createdAt: Timestamp | string;
  editedAt?: Timestamp | string;
  clientMessageId?: string; // for optimistic updates/dedup
};

export type ChatPresence = {
  userId: string;
  teamId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActiveAt: Timestamp | string;
  typingIn?: { channelId: string; since: Timestamp | string } | null;
};
