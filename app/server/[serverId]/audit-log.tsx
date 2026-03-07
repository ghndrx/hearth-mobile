import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Shield,
  Hash,
  Settings,
  MessageSquare,
  Ban,
  AlertTriangle,
} from 'lucide-react-native';

interface AuditLogEntry {
  id: string;
  action: string;
  type:
    | 'member_join'
    | 'member_leave'
    | 'member_kick'
    | 'member_ban'
    | 'channel_create'
    | 'channel_edit'
    | 'channel_delete'
    | 'role_create'
    | 'role_edit'
    | 'role_delete'
    | 'message_delete'
    | 'settings_update';
  actor: string;
  target?: string;
  details?: string;
  timestamp: string;
}

const getActionIcon = (type: AuditLogEntry['type']) => {
  const iconProps = { size: 20, color: '#9CA3AF' };
  
  switch (type) {
    case 'member_join':
      return <UserPlus {...iconProps} color="#10B981" />;
    case 'member_leave':
      return <UserMinus {...iconProps} />;
    case 'member_kick':
      return <UserMinus {...iconProps} color="#F59E0B" />;
    case 'member_ban':
      return <Ban {...iconProps} color="#EF4444" />;
    case 'channel_create':
      return <Hash {...iconProps} color="#10B981" />;
    case 'channel_edit':
      return <Edit {...iconProps} color="#3B82F6" />;
    case 'channel_delete':
      return <Trash2 {...iconProps} color="#EF4444" />;
    case 'role_create':
      return <Shield {...iconProps} color="#10B981" />;
    case 'role_edit':
      return <Shield {...iconProps} color="#3B82F6" />;
    case 'role_delete':
      return <Shield {...iconProps} color="#EF4444" />;
    case 'message_delete':
      return <MessageSquare {...iconProps} color="#F59E0B" />;
    case 'settings_update':
      return <Settings {...iconProps} color="#3B82F6" />;
    default:
      return <AlertTriangle {...iconProps} />;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export default function ServerAuditLogScreen() {
  const { serverId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - replace with actual API calls
  const [logs] = useState<AuditLogEntry[]>([
    {
      id: '1',
      action: 'joined the server',
      type: 'member_join',
      actor: 'Alice',
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
    },
    {
      id: '2',
      action: 'created channel',
      type: 'channel_create',
      actor: 'Bob',
      target: '#general-chat',
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15 mins ago
    },
    {
      id: '3',
      action: 'edited role',
      type: 'role_edit',
      actor: 'Admin',
      target: '@Moderator',
      details: 'Updated permissions',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: '4',
      action: 'banned member',
      type: 'member_ban',
      actor: 'Moderator',
      target: 'Spammer123',
      details: 'Reason: Spam',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: '5',
      action: 'deleted messages',
      type: 'message_delete',
      actor: 'Moderator',
      details: '5 messages in #general',
      timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    },
    {
      id: '6',
      action: 'updated server settings',
      type: 'settings_update',
      actor: 'Admin',
      details: 'Changed verification level',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: '7',
      action: 'kicked member',
      type: 'member_kick',
      actor: 'Moderator',
      target: 'Troublemaker',
      details: 'Reason: Inappropriate behavior',
      timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
    {
      id: '8',
      action: 'deleted channel',
      type: 'channel_delete',
      actor: 'Admin',
      target: '#old-announcements',
      timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    // In production: fetch latest audit logs from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-gray-950">
      <Stack.Screen
        options={{
          title: 'Audit Log',
          headerStyle: { backgroundColor: '#030712' },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {/* Info Banner */}
          <View className="bg-indigo-900/30 border border-indigo-700/50 p-4 rounded-lg mb-4">
            <Text className="text-indigo-300 text-sm">
              Audit logs are kept for 90 days. Actions by admins and moderators
              are automatically logged here.
            </Text>
          </View>

          {/* Audit Log Entries */}
          <View className="space-y-3">
            {logs.map((log, index) => (
              <View
                key={log.id}
                className="bg-gray-900 p-4 rounded-lg border border-gray-800"
              >
                <View className="flex-row items-start">
                  {/* Icon */}
                  <View className="mr-3 mt-0.5">{getActionIcon(log.type)}</View>

                  {/* Content */}
                  <View className="flex-1">
                    {/* Main Action */}
                    <Text className="text-white text-base">
                      <Text className="font-semibold">{log.actor}</Text>
                      <Text className="text-gray-400"> {log.action}</Text>
                      {log.target && (
                        <Text className="text-gray-300"> {log.target}</Text>
                      )}
                    </Text>

                    {/* Details */}
                    {log.details && (
                      <Text className="text-gray-400 text-sm mt-1">
                        {log.details}
                      </Text>
                    )}

                    {/* Timestamp */}
                    <Text className="text-gray-500 text-xs mt-2">
                      {formatTimestamp(log.timestamp)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {logs.length === 0 && (
            <View className="items-center justify-center py-12">
              <Text className="text-gray-400 text-center">
                No audit log entries yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
