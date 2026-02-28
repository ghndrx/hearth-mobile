/**
 * Deep Linking Service
 * Handles universal links (iOS), app links (Android), and custom URL schemes.
 *
 * Supported deep link patterns:
 * - hearth://chat/:chatId - Open a specific chat
 * - hearth://server/:serverId - Open a server
 * - hearth://server/:serverId/channel/:channelId - Open a specific channel
 * - hearth://invite/:inviteCode - Join via invite link
 * - hearth://profile/:userId - View user profile
 * - hearth://settings - Open settings
 * - hearth://settings/:section - Open specific settings section
 *
 * Universal links (iOS) / App links (Android):
 * - https://hearth.app/chat/:chatId
 * - https://hearth.app/invite/:inviteCode
 * - etc.
 */

import * as Linking from "expo-linking";
import { router } from "expo-router";

export interface DeepLinkRoute {
  path: string;
  params: Record<string, string>;
}

type DeepLinkHandler = (route: DeepLinkRoute) => void;

const UNIVERSAL_LINK_HOSTS = [
  "hearth.app",
  "www.hearth.app",
  "link.hearth.app",
];

/**
 * Parse a deep link URL into a route object
 */
export function parseDeepLink(url: string): DeepLinkRoute | null {
  try {
    const parsed = Linking.parse(url);

    // Handle both custom scheme and universal links
    const path = parsed.path || "";
    const queryParams = parsed.queryParams || {};

    // Extract path segments
    const segments = path.split("/").filter(Boolean);

    if (segments.length === 0) {
      return { path: "/", params: queryParams as Record<string, string> };
    }

    // Route mapping based on first segment
    const [firstSegment, ...rest] = segments;

    switch (firstSegment) {
      case "chat":
        if (rest[0]) {
          return {
            path: `/chat/${rest[0]}`,
            params: { id: rest[0], ...queryParams },
          };
        }
        break;

      case "server":
        if (rest[0] && rest[1] === "channel" && rest[2]) {
          // Server channel link
          return {
            path: `/server/${rest[0]}/channel/${rest[2]}`,
            params: {
              serverId: rest[0],
              channelId: rest[2],
              ...queryParams,
            },
          };
        } else if (rest[0]) {
          // Server root link
          return {
            path: `/server/${rest[0]}`,
            params: { serverId: rest[0], ...queryParams },
          };
        }
        break;

      case "invite":
        if (rest[0]) {
          return {
            path: `/invite/${rest[0]}`,
            params: { code: rest[0], ...queryParams },
          };
        }
        break;

      case "profile":
        if (rest[0]) {
          return {
            path: `/profile/${rest[0]}`,
            params: { userId: rest[0], ...queryParams },
          };
        }
        break;

      case "settings": {
        const section = rest[0] || "index";
        return {
          path: `/settings/${section}`,
          params: { section, ...queryParams },
        };
      }

      case "voice":
        if (rest[0]) {
          return {
            path: `/voice/${rest[0]}`,
            params: { id: rest[0], ...queryParams },
          };
        }
        break;

      case "search":
        return {
          path: "/search",
          params: queryParams as Record<string, string>,
        };

      case "dms":
      case "messages":
        return {
          path: "/(tabs)/dms",
          params: queryParams as Record<string, string>,
        };

      default:
        // Check if it's a join link (short format)
        if (firstSegment.length >= 6 && firstSegment.length <= 10) {
          // Might be an invite code
          return {
            path: `/invite/${firstSegment}`,
            params: { code: firstSegment, ...queryParams },
          };
        }
    }

    return { path: `/${path}`, params: queryParams as Record<string, string> };
  } catch (error) {
    console.error("Failed to parse deep link:", error);
    return null;
  }
}

/**
 * Navigate to a deep link route
 */
export function navigateToDeepLink(route: DeepLinkRoute): void {
  try {
    // Handle special routes that need different navigation
    if (route.path.startsWith("/invite/")) {
      // Show invite modal or navigate to invite screen
      router.push({
        pathname: "/server/join" as const,
        params: route.params,
      });
      return;
    }

    // Standard navigation (path comes from dynamic deep link parsing)
    router.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pathname: route.path as any,
      params: route.params,
    });
  } catch (error) {
    console.error("Failed to navigate to deep link:", error);
    // Fall back to home
    router.replace("/");
  }
}

/**
 * Handle an incoming deep link URL
 */
export function handleDeepLink(url: string): boolean {
  const route = parseDeepLink(url);
  if (!route) {
    return false;
  }

  navigateToDeepLink(route);
  return true;
}

/**
 * Create a shareable deep link URL
 */
export function createDeepLink(
  type: "chat" | "server" | "channel" | "invite" | "profile",
  params: Record<string, string>,
  options?: {
    useUniversalLink?: boolean;
    host?: string;
  }
): string {
  const baseUrl = options?.useUniversalLink
    ? `https://${options.host || "hearth.app"}`
    : "hearth://";

  switch (type) {
    case "chat":
      return `${baseUrl}/chat/${params.chatId}`;

    case "server":
      return `${baseUrl}/server/${params.serverId}`;

    case "channel":
      return `${baseUrl}/server/${params.serverId}/channel/${params.channelId}`;

    case "invite":
      return `${baseUrl}/invite/${params.code}`;

    case "profile":
      return `${baseUrl}/profile/${params.userId}`;

    default:
      return baseUrl;
  }
}

/**
 * Deep link subscription manager
 */
class DeepLinkManager {
  private handlers: Set<DeepLinkHandler> = new Set();
  private subscription: ReturnType<typeof Linking.addEventListener> | null = null;
  private initialURLHandled = false;

  /**
   * Initialize deep link handling
   */
  async initialize(): Promise<void> {
    // Handle initial URL (app opened via deep link)
    if (!this.initialURLHandled) {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        this.handleURL(initialURL);
      }
      this.initialURLHandled = true;
    }

    // Listen for incoming URLs while app is running
    if (!this.subscription) {
      this.subscription = Linking.addEventListener("url", ({ url }) => {
        this.handleURL(url);
      });
    }
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.handlers.clear();
  }

  /**
   * Add a handler for deep links
   */
  addHandler(handler: DeepLinkHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Handle an incoming URL
   */
  private handleURL(url: string): void {
    const route = parseDeepLink(url);
    if (!route) return;

    // Notify all handlers
    Array.from(this.handlers).forEach((handler) => {
      try {
        handler(route);
      } catch (error) {
        console.error("Deep link handler error:", error);
      }
    });

    // Navigate to the route
    navigateToDeepLink(route);
  }
}

export const deepLinkManager = new DeepLinkManager();

/**
 * iOS App Clip configuration
 * For App Clips, we handle lightweight experiences for specific deep links
 */
export const appClipConfig = {
  supportedActions: ["view_server", "join_invite", "view_chat"],
  maxDataSize: 10 * 1024 * 1024, // 10MB limit for App Clips
  experienceURL: "https://hearth.app/clip",
};

/**
 * Android Instant Apps configuration
 */
export const instantAppConfig = {
  supportedFeatures: ["chat", "invite", "server"],
  installPromptDelay: 30000, // Show install prompt after 30s
};

/**
 * Validate if a URL is a valid Hearth deep link
 */
export function isValidHearthLink(url: string): boolean {
  try {
    // Check custom scheme
    if (url.startsWith("hearth://")) {
      return true;
    }

    // Check universal links
    const parsed = new URL(url);
    return UNIVERSAL_LINK_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Get the platform-specific deep link configuration
 */
export function getDeepLinkConfig() {
  return {
    prefixes: [
      "hearth://",
      "https://hearth.app",
      "https://www.hearth.app",
      "https://link.hearth.app",
    ],
    scheme: "hearth",
    screens: {
      Chat: "chat/:id",
      Server: "server/:serverId",
      Channel: "server/:serverId/channel/:channelId",
      Invite: "invite/:code",
      Profile: "profile/:userId",
      Settings: "settings/:section?",
      Voice: "voice/:id",
      Search: "search",
      DMs: "dms",
    },
  };
}
