import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
  memberCount: number;
  isDefault: boolean;
}

// Mock data - replace with API call
const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    color: '#FF5555',
    position: 100,
    permissions: ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS'],
    memberCount: 2,
    isDefault: false,
  },
  {
    id: '2',
    name: 'Moderator',
    color: '#55AAFF',
    position: 50,
    permissions: ['MANAGE_MESSAGES', 'KICK_MEMBERS', 'MUTE_MEMBERS'],
    memberCount: 5,
    isDefault: false,
  },
  {
    id: '3',
    name: 'Member',
    color: '#AAAAAA',
    position: 1,
    permissions: ['SEND_MESSAGES', 'READ_MESSAGES', 'ADD_REACTIONS'],
    memberCount: 128,
    isDefault: true,
  },
];

export default function RolesListScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      setRoles(mockRoles);
      setLoading(false);
    }, 500);
  }, [serverId]);

  const handleRolePress = (roleId: string) => {
    router.push(`/server/${serverId}/roles/${roleId}`);
  };

  const handleCreateRole = () => {
    router.push(`/server/${serverId}/roles/create`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-white text-lg">Loading roles...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <View className="px-4 py-3 border-b border-gray-800 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text className="text-white text-xl font-bold">Roles</Text>
        </View>
        <Pressable
          onPress={handleCreateRole}
          className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-semibold ml-1">Create</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 py-3">
        <Text className="text-gray-400 text-sm mb-3">
          {roles.length} {roles.length === 1 ? 'role' : 'roles'} • Drag to reorder
        </Text>

        {roles
          .sort((a, b) => b.position - a.position)
          .map((role) => (
            <Pressable
              key={role.id}
              onPress={() => handleRolePress(role.id)}
              className="bg-gray-800 rounded-xl p-4 mb-3 flex-row items-center"
            >
              <View
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: role.color }}
              />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-white font-semibold text-base">
                    {role.name}
                  </Text>
                  {role.isDefault && (
                    <View className="bg-gray-700 px-2 py-0.5 rounded ml-2">
                      <Text className="text-gray-400 text-xs">Default</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                  <Text className="text-gray-400 text-sm ml-1">
                    {role.memberCount} {role.memberCount === 1 ? 'member' : 'members'}
                  </Text>
                  <Text className="text-gray-600 mx-2">•</Text>
                  <Ionicons name="shield-outline" size={14} color="#9CA3AF" />
                  <Text className="text-gray-400 text-sm ml-1">
                    {role.permissions.length} permissions
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </Pressable>
          ))}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
