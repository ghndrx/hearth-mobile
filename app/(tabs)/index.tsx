import { useState } from "react";
import { ServerListScreen } from "../../components/server";
import type { Server } from "../../lib/types";

const mockServers: Server[] = [
  {
    id: "1",
    name: "Gaming Hub",
    description: "A community for gamers to connect and play together",
    memberCount: 1234,
    unreadCount: 5,
    isOnline: true,
    ownerId: "owner1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Tech Talk",
    description: "Discuss the latest in technology and programming",
    memberCount: 567,
    unreadCount: 0,
    isOnline: true,
    ownerId: "owner2",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Design Community",
    description: "Share your designs and get feedback",
    memberCount: 890,
    unreadCount: 12,
    isOnline: false,
    ownerId: "owner3",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Music Lovers",
    description: "For music enthusiasts and artists",
    memberCount: 2345,
    unreadCount: 0,
    isOnline: true,
    ownerId: "owner4",
    createdAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Book Club",
    description: "Discuss your favorite books and discover new ones",
    memberCount: 456,
    unreadCount: 3,
    isOnline: false,
    ownerId: "owner5",
    createdAt: new Date().toISOString(),
  },
];

export default function ServersPage() {
  const [servers] = useState<Server[]>(mockServers);

  const handleRefresh = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
  };

  return (
    <ServerListScreen
      servers={servers}
      onRefresh={handleRefresh}
      title="My Servers"
    />
  );
}
