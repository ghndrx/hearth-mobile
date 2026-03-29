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

export interface ServerInvite {
  id: string;
  server: {
    id: string;
    name: string;
    icon?: string;
    memberCount: number;
    description?: string;
  };
  inviter: User;
  expiresAt?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
  isDefault?: boolean;
}

export interface ServerMember {
  id: string;
  user: User;
  serverId: string;
  nickname?: string;
  roles: Role[];
  joinedAt: string;
  isMuted?: boolean;
  isBanned?: boolean;
  isOwner?: boolean;
}

// API Management Types
export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  name: string;
  description?: string;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

export interface ApiUsageMetrics {
  endpointId: string;
  endpoint: string;
  method: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  rateLimitHits: number;
  lastRequestAt?: string;
  timeWindow: string; // e.g., "1h", "24h", "7d"
}

export interface ApiRateLimit {
  endpointId: string;
  endpoint: string;
  method: string;
  limit: number;
  remaining: number;
  resetTime: string;
  windowMs: number;
  isBlocked: boolean;
}

export interface ApiRequest {
  id: string;
  endpointId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  userAgent?: string;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
}

export interface ApiDashboardStats {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  rateLimitViolations: number;
  activeEndpoints: number;
  requestsToday: number;
  requestsThisHour: number;
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    requestCount: number;
    successRate: number;
  }>;
  recentErrors: Array<{
    endpoint: string;
    method: string;
    error: string;
    timestamp: string;
  }>;
}

export interface ApiMonitoringEvent {
  type: "request" | "error" | "rate_limit" | "slow_response";
  endpoint: string;
  method: string;
  data: any;
  timestamp: string;
}

// Re-export offline types
export * from "./offline";

// Re-export IoT types
export * from "./iot";

// Re-export onboarding types
export * from "./onboarding";
