export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email: string;
  bio?: string;
  status?: "online" | "offline" | "idle" | "dnd" | "invisible";
  createdAt?: string;
  updatedAt?: string;
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  unreadCount: number;
  isOnline: boolean;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement";
  serverId: string;
  categoryId?: string;
  position: number;
  unreadCount?: number;
  isActive?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  serverId: string;
  position: number;
  channels: Channel[];
  isCollapsed?: boolean;
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  author?: User;
  channelId: string;
  serverId?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: "message" | "mention" | "friend" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface VoiceParticipant {
  id: string;
  user: User;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
  joinedAt: Date;
}

export interface VoiceState {
  isMuted: boolean;
  isDeafened: boolean;
  isConnected: boolean;
}

export interface VoiceChannel extends Channel {
  type: "voice";
  participants?: VoiceParticipant[];
  bitrate?: number;
  userLimit?: number;
}
