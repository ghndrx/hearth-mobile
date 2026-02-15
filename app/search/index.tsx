import { useState, useCallback, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  SearchScreen,
  SearchFilters,
  SearchResult,
} from "../../components/search";
import type { Channel, User, Message, Attachment } from "../../lib/types";

// Mock data for development
const mockChannels: Channel[] = [
  {
    id: "1",
    name: "general",
    type: "text",
    serverId: "server1",
    position: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "announcements",
    type: "announcement",
    serverId: "server1",
    position: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "random",
    type: "text",
    serverId: "server1",
    position: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "help",
    type: "text",
    serverId: "server1",
    position: 3,
    createdAt: new Date().toISOString(),
  },
];

const mockUsers: User[] = [
  {
    id: "1",
    username: "johndoe",
    displayName: "John Doe",
    email: "john@example.com",
    status: "online",
  },
  {
    id: "2",
    username: "janedoe",
    displayName: "Jane Doe",
    email: "jane@example.com",
    status: "idle",
  },
  {
    id: "3",
    username: "bobsmith",
    displayName: "Bob Smith",
    email: "bob@example.com",
    status: "offline",
  },
];

const mockMessages: SearchResult[] = [
  {
    id: "msg1",
    content: "Hey everyone! Welcome to the general channel.",
    authorId: "1",
    author: mockUsers[0],
    channelId: "1",
    channelName: "general",
    serverName: "My Server",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "msg2",
    content:
      "Does anyone have the project files? I need to review them before the meeting tomorrow.",
    authorId: "2",
    author: mockUsers[1],
    channelId: "1",
    channelName: "general",
    serverName: "My Server",
    attachments: [
      {
        id: "att1",
        url: "https://example.com/file.pdf",
        filename: "project_spec.pdf",
        contentType: "application/pdf",
        size: 1024 * 1024,
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: "msg3",
    content: "I've uploaded the design mockups to the shared folder.",
    authorId: "3",
    author: mockUsers[2],
    channelId: "3",
    channelName: "random",
    serverName: "My Server",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "msg4",
    content: "Important announcement: Server maintenance scheduled for tomorrow at 2 AM.",
    authorId: "1",
    author: mockUsers[0],
    channelId: "2",
    channelName: "announcements",
    serverName: "My Server",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "msg5",
    content: "Can someone help me with the login issue? I keep getting an error.",
    authorId: "2",
    author: mockUsers[1],
    channelId: "4",
    channelName: "help",
    serverName: "My Server",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

export default function SearchRoute() {
  const params = useLocalSearchParams<{
    q?: string;
    channelId?: string;
    userId?: string;
  }>();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Parse initial filters from URL params
  const initialFilters: SearchFilters = {
    channelId: params.channelId,
    userId: params.userId,
  };

  // Simulate search functionality
  const handleSearch = useCallback(
    async (query: string, filters: SearchFilters) => {
      if (!query.trim() && !filters.channelId && !filters.userId && !filters.hasFile) {
        setResults([]);
        return;
      }

      setIsLoading(true);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Filter mock messages based on query and filters
      let filteredResults = [...mockMessages];

      // Text search
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        filteredResults = filteredResults.filter(
          (msg) =>
            msg.content.toLowerCase().includes(lowerQuery) ||
            msg.author?.displayName?.toLowerCase().includes(lowerQuery) ||
            msg.author?.username?.toLowerCase().includes(lowerQuery)
        );
      }

      // Channel filter
      if (filters.channelId) {
        filteredResults = filteredResults.filter(
          (msg) => msg.channelId === filters.channelId
        );
      }

      // User filter
      if (filters.userId) {
        filteredResults = filteredResults.filter(
          (msg) => msg.authorId === filters.userId
        );
      }

      // Has file filter
      if (filters.hasFile) {
        filteredResults = filteredResults.filter(
          (msg) => msg.attachments && msg.attachments.length > 0
        );
      }

      setResults(filteredResults);
      setIsLoading(false);
    },
    []
  );

  const handleRefresh = useCallback(async () => {
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Trigger initial search if query params are provided
  useEffect(() => {
    if (params.q || params.channelId || params.userId) {
      handleSearch(params.q || "", initialFilters);
    }
  }, []);

  return (
    <SearchScreen
      initialQuery={params.q}
      initialFilters={initialFilters}
      results={results}
      isLoading={isLoading}
      onSearch={handleSearch}
      onRefresh={handleRefresh}
      channels={mockChannels}
      users={mockUsers}
    />
  );
}
