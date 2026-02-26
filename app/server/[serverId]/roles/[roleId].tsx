import { View, Text, ScrollView, Pressable, TextInput, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

interface Permission {
  key: string;
  label: string;
  description: string;
  category: string;
}

const PERMISSIONS: Permission[] = [
  // General
  { key: 'VIEW_CHANNELS', label: 'View Channels', description: 'Allows members to view channels', category: 'General' },
  { key: 'MANAGE_CHANNELS', label: 'Manage Channels', description: 'Create, edit, and delete channels', category: 'General' },
  { key: 'MANAGE_ROLES', label: 'Manage Roles', description: 'Create, edit, and delete roles', category: 'General' },
  { key: 'MANAGE_SERVER', label: 'Manage Server', description: 'Edit server settings and invite links', category: 'General' },
  // Membership
  { key: 'CREATE_INVITES', label: 'Create Invites', description: 'Invite new members to the server', category: 'Membership' },
  { key: 'KICK_MEMBERS', label: 'Kick Members', description: 'Remove members from the server', category: 'Membership' },
  { key: 'BAN_MEMBERS', label: 'Ban Members', description: 'Permanently ban members', category: 'Membership' },
  // Messages
  { key: 'SEND_MESSAGES', label: 'Send Messages', description: 'Send messages in text channels', category: 'Messages' },
  { key: 'MANAGE_MESSAGES', label: 'Manage Messages', description: 'Delete and pin messages', category: 'Messages' },
  { key: 'EMBED_LINKS', label: 'Embed Links', description: 'Links show embedded previews', category: 'Messages' },
  { key: 'ATTACH_FILES', label: 'Attach Files', description: 'Upload files and images', category: 'Messages' },
  { key: 'ADD_REACTIONS', label: 'Add Reactions', description: 'Add emoji reactions to messages', category: 'Messages' },
  { key: 'MENTION_EVERYONE', label: 'Mention Everyone', description: 'Use @everyone and @here', category: 'Messages' },
  // Voice
  { key: 'CONNECT', label: 'Connect', description: 'Join voice channels', category: 'Voice' },
  { key: 'SPEAK', label: 'Speak', description: 'Talk in voice channels', category: 'Voice' },
  { key: 'MUTE_MEMBERS', label: 'Mute Members', description: 'Mute other members in voice', category: 'Voice' },
  { key: 'DEAFEN_MEMBERS', label: 'Deafen Members', description: 'Deafen other members in voice', category: 'Voice' },
  { key: 'MOVE_MEMBERS', label: 'Move Members', description: 'Move members between voice channels', category: 'Voice' },
  // Admin
  { key: 'ADMINISTRATOR', label: 'Administrator', description: 'All permissions, bypasses channel restrictions', category: 'Administrator' },
];

const PRESET_COLORS = [
  '#FF5555', '#FF8C55', '#FFDD55', '#55FF55', '#55DDFF', 
  '#5555FF', '#AA55FF', '#FF55AA', '#AAAAAA', '#FFFFFF',
];

export default function RoleEditScreen() {
  const { serverId: _serverId, roleId } = useLocalSearchParams<{ serverId: string; roleId: string }>();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [color, setColor] = useState('#AAAAAA');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      if (roleId === '1') {
        setName('Admin');
        setColor('#FF5555');
        setPermissions(new Set(['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS']));
      } else if (roleId === '2') {
        setName('Moderator');
        setColor('#55AAFF');
        setPermissions(new Set(['MANAGE_MESSAGES', 'KICK_MEMBERS', 'MUTE_MEMBERS']));
      } else {
        setName('Member');
        setColor('#AAAAAA');
        setPermissions(new Set(['SEND_MESSAGES', 'VIEW_CHANNELS', 'ADD_REACTIONS']));
      }
      setLoading(false);
    }, 300);
  }, [roleId]);

  const togglePermission = (key: string) => {
    const newPermissions = new Set(permissions);
    if (newPermissions.has(key)) {
      newPermissions.delete(key);
    } else {
      newPermissions.add(key);
    }
    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 500);
  };

  const handleDelete = () => {
    // TODO: Add confirmation dialog and API call
    router.back();
  };

  const categories = [...new Set(PERMISSIONS.map(p => p.category))];

  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-white text-lg">Loading role...</Text>
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
          <Text className="text-white text-xl font-bold">Edit Role</Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-indigo-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Role Name */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm font-medium mb-2 uppercase">
            Role Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Role name"
            placeholderTextColor="#6B7280"
            className="bg-gray-800 text-white px-4 py-3 rounded-xl text-base"
          />
        </View>

        {/* Role Color */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm font-medium mb-2 uppercase">
            Role Color
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {PRESET_COLORS.map((presetColor) => (
              <Pressable
                key={presetColor}
                onPress={() => setColor(presetColor)}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  color === presetColor ? 'border-2 border-white' : ''
                }`}
                style={{ backgroundColor: presetColor }}
              >
                {color === presetColor && (
                  <Ionicons name="checkmark" size={20} color={presetColor === '#FFFFFF' ? '#000' : '#FFF'} />
                )}
              </Pressable>
            ))}
          </View>
          <View className="flex-row items-center mt-3 bg-gray-800 rounded-xl px-4 py-3">
            <View
              className="w-6 h-6 rounded-full mr-3"
              style={{ backgroundColor: color }}
            />
            <TextInput
              value={color}
              onChangeText={setColor}
              placeholder="#AAAAAA"
              placeholderTextColor="#6B7280"
              className="text-white text-base flex-1"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Permissions */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm font-medium mb-3 uppercase">
            Permissions ({permissions.size} enabled)
          </Text>

          {categories.map((category) => (
            <View key={category} className="mb-4">
              <Text className="text-gray-500 text-xs font-semibold mb-2 uppercase">
                {category}
              </Text>
              {PERMISSIONS.filter(p => p.category === category).map((permission) => (
                <View
                  key={permission.key}
                  className="bg-gray-800 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-white font-medium">{permission.label}</Text>
                    <Text className="text-gray-500 text-sm mt-0.5">
                      {permission.description}
                    </Text>
                  </View>
                  <Switch
                    value={permissions.has(permission.key)}
                    onValueChange={() => togglePermission(permission.key)}
                    trackColor={{ false: '#374151', true: '#6366F1' }}
                    thumbColor={permissions.has(permission.key) ? '#FFF' : '#9CA3AF'}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <View className="mb-20">
          <Text className="text-red-500 text-sm font-medium mb-2 uppercase">
            Danger Zone
          </Text>
          <Pressable
            onPress={handleDelete}
            className="bg-red-900/30 border border-red-500/50 rounded-xl px-4 py-3 flex-row items-center"
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text className="text-red-500 font-medium ml-2">Delete Role</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
