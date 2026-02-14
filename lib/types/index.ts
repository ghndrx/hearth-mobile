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
  position: number;
  createdAt: string;
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
