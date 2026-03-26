export type WidgetSize = "small" | "medium" | "large";
export type WidgetType = "unread_messages" | "mentions" | "direct_messages";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  serverId?: string;
  channelId?: string;
  enabled: boolean;
  refreshInterval: number; // minutes
  lastUpdated?: string;
}

export interface UnreadMessagesData {
  totalUnread: number;
  channels: WidgetChannelSummary[];
}

export interface WidgetChannelSummary {
  id: string;
  name: string;
  serverName: string;
  serverIcon?: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAuthor: string;
  lastMessageTimestamp: string;
}

export interface MentionsData {
  totalMentions: number;
  mentions: WidgetMention[];
}

export interface WidgetMention {
  id: string;
  channelId: string;
  channelName: string;
  serverName: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
}

export interface DirectMessagesData {
  totalUnread: number;
  conversations: WidgetConversation[];
}

export interface WidgetConversation {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  isGroup: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageTimestamp: string;
}

export type WidgetData =
  | { type: "unread_messages"; data: UnreadMessagesData }
  | { type: "mentions"; data: MentionsData }
  | { type: "direct_messages"; data: DirectMessagesData };
