import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, SwitchItem, ListDivider, Button } from '../ui';
import { SoundPicker, VibrationPicker } from './SoundPicker';
import {
  notificationPermissions,
  PriorityContact,
} from '../../lib/services/notificationPermissions';
import { User } from '../../lib/types';

interface PriorityContactsManagerProps {
  users?: User[]; // Available users to add as priority contacts
  onContactsChange?: (contacts: PriorityContact[]) => void;
}

interface ContactItemProps {
  contact: PriorityContact;
  onUpdate: (contact: PriorityContact) => void;
  onRemove: (contactId: string) => void;
  isDark: boolean;
}

function ContactItem({ contact, onUpdate, onRemove, isDark }: ContactItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showVibrationPicker, setShowVibrationPicker] = useState(false);

  const updateOverrides = async (updates: Partial<PriorityContact['notificationOverrides']>) => {
    try {
      const updatedContact = {
        ...contact,
        notificationOverrides: {
          ...contact.notificationOverrides,
          ...updates,
        },
      };

      // Re-add contact with updated settings
      const user: User = {
        id: contact.userId,
        username: contact.username,
        displayName: contact.displayName,
        avatar: contact.avatar,
        email: '', // Not needed for this operation
      };

      await notificationPermissions.addPriorityContact(
        user,
        contact.priority,
        updatedContact.notificationOverrides
      );

      onUpdate(updatedContact);
    } catch (error) {
      console.error('Failed to update priority contact:', error);
      Alert.alert('Error', 'Failed to update contact settings');
    }
  };

  const updatePriority = async (priority: PriorityContact['priority']) => {
    try {
      const user: User = {
        id: contact.userId,
        username: contact.username,
        displayName: contact.displayName,
        avatar: contact.avatar,
        email: '',
      };

      await notificationPermissions.addPriorityContact(
        user,
        priority,
        contact.notificationOverrides
      );

      onUpdate({ ...contact, priority });
    } catch (error) {
      console.error('Failed to update priority level:', error);
      Alert.alert('Error', 'Failed to update priority level');
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className={`flex-row items-center justify-between p-4 ${
          isDark ? 'bg-dark-800' : 'bg-white'
        }`}
      >
        <View className="flex-row items-center flex-1">
          {contact.avatar ? (
            <View className="w-10 h-10 rounded-full bg-gray-300" />
          ) : (
            <View className={`w-10 h-10 rounded-full items-center justify-center ${
              contact.priority === 'urgent'
                ? 'bg-red-500/20'
                : 'bg-blue-500/20'
            }`}>
              <Text className={`font-bold ${
                contact.priority === 'urgent' ? 'text-red-500' : 'text-blue-500'
              }`}>
                {contact.displayName[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {contact.displayName}
              </Text>
              <View className={`ml-2 px-2 py-0.5 rounded-full ${
                contact.priority === 'urgent'
                  ? 'bg-red-500/20'
                  : 'bg-blue-500/20'
              }`}>
                <Text className={`text-xs font-medium ${
                  contact.priority === 'urgent' ? 'text-red-500' : 'text-blue-500'
                }`}>
                  {contact.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
              @{contact.username}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Remove Priority Contact',
                `Remove ${contact.displayName} from priority contacts?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => onRemove(contact.userId),
                  },
                ]
              );
            }}
            className="mr-3 p-1"
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={isDark ? '#80848e' : '#6b7280'}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Settings */}
      {isExpanded && (
        <View className={`border-t ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
          <View className="p-4 space-y-4">

            {/* Priority Level */}
            <View>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Priority Level
              </Text>
              <View className={`rounded-xl overflow-hidden ${
                isDark ? 'bg-dark-700' : 'bg-gray-50'
              } border ${isDark ? 'border-dark-600' : 'border-gray-200'}`}>
                <TouchableOpacity
                  onPress={() => updatePriority('high')}
                  className={`p-3 flex-row items-center justify-between ${
                    contact.priority === 'high'
                      ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
                      : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      High Priority
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                      Always receive notifications, with custom alerts
                    </Text>
                  </View>
                  {contact.priority === 'high' && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
                <View className={`h-px ${isDark ? 'bg-dark-600' : 'bg-gray-200'}`} />
                <TouchableOpacity
                  onPress={() => updatePriority('urgent')}
                  className={`p-3 flex-row items-center justify-between ${
                    contact.priority === 'urgent'
                      ? (isDark ? 'bg-red-600/20' : 'bg-red-50')
                      : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Urgent Priority
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                      Override Do Not Disturb and quiet hours
                    </Text>
                  </View>
                  {contact.priority === 'urgent' && (
                    <Ionicons name="checkmark" size={20} color="#ef4444" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Override Settings */}
            <View>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Notification Overrides
              </Text>
              <View className={`rounded-xl overflow-hidden ${
                isDark ? 'bg-dark-800' : 'bg-white'
              } border ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
                <SwitchItem
                  title="Always Notify"
                  subtitle="Override all notification filters"
                  value={contact.notificationOverrides.alwaysNotify}
                  onValueChange={(value) => updateOverrides({ alwaysNotify: value })}
                />
                <ListDivider />
                <SwitchItem
                  title="Bypass Quiet Hours"
                  subtitle="Send notifications during quiet hours"
                  value={contact.notificationOverrides.bypassQuietHours}
                  onValueChange={(value) => updateOverrides({ bypassQuietHours: value })}
                />
                <ListDivider />
                <SwitchItem
                  title="Bypass Do Not Disturb"
                  subtitle="Send notifications even in DND mode"
                  value={contact.notificationOverrides.bypassDoNotDisturb}
                  onValueChange={(value) => updateOverrides({ bypassDoNotDisturb: value })}
                />
              </View>
            </View>

            {/* Custom Alerts */}
            <View>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Custom Alerts
              </Text>
              <View className={`rounded-xl overflow-hidden ${
                isDark ? 'bg-dark-800' : 'bg-white'
              } border ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
                <TouchableOpacity
                  className="p-4 flex-row items-center justify-between"
                  onPress={() => setShowSoundPicker(true)}
                >
                  <View>
                    <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Custom Sound
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                      {contact.notificationOverrides.customSound || 'Default'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#80848e' : '#6b7280'} />
                </TouchableOpacity>
                <ListDivider />
                <TouchableOpacity
                  className="p-4 flex-row items-center justify-between"
                  onPress={() => setShowVibrationPicker(true)}
                >
                  <View>
                    <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Custom Vibration
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                      {contact.notificationOverrides.customVibration || 'Default'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#80848e' : '#6b7280'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Sound Picker Modal */}
      <SoundPicker
        visible={showSoundPicker}
        currentSoundId={contact.notificationOverrides.customSound}
        onSelect={(soundId) => {
          updateOverrides({ customSound: soundId });
          setShowSoundPicker(false);
        }}
        onClose={() => setShowSoundPicker(false)}
        title={`${contact.displayName} - Notification Sound`}
        allowCustom={true}
      />

      {/* Vibration Picker Modal */}
      <VibrationPicker
        visible={showVibrationPicker}
        currentPatternId={contact.notificationOverrides.customVibration}
        onSelect={(patternId) => {
          updateOverrides({ customVibration: patternId });
          setShowVibrationPicker(false);
        }}
        onClose={() => setShowVibrationPicker(false)}
        title={`${contact.displayName} - Vibration Pattern`}
      />
    </Card>
  );
}

export function PriorityContactsManager({
  users = [],
  onContactsChange
}: PriorityContactsManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [contacts, setContacts] = useState<PriorityContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const priorityContacts = await notificationPermissions.getPriorityContacts();
      setContacts(priorityContacts);
      onContactsChange?.(priorityContacts);
    } catch (error) {
      console.error('Failed to load priority contacts:', error);
      Alert.alert('Error', 'Failed to load priority contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const addContact = async (user: User, priority: PriorityContact['priority'] = 'high') => {
    try {
      await notificationPermissions.addPriorityContact(user, priority);
      loadContacts();
      setShowAddModal(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to add priority contact:', error);
      Alert.alert('Error', 'Failed to add priority contact');
    }
  };

  const removeContact = async (userId: string) => {
    try {
      await notificationPermissions.removePriorityContact(userId);
      loadContacts();
    } catch (error) {
      console.error('Failed to remove priority contact:', error);
      Alert.alert('Error', 'Failed to remove priority contact');
    }
  };

  const updateContact = (updatedContact: PriorityContact) => {
    setContacts(prev =>
      prev.map(c => c.userId === updatedContact.userId ? updatedContact : c)
    );
    onContactsChange?.(contacts);
  };

  const filteredUsers = users.filter(user =>
    !contacts.some(c => c.userId === user.id) &&
    (user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <View className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
              <View className="ml-3 flex-1">
                <View className="h-4 bg-gray-300 rounded animate-pulse" />
                <View className="h-3 bg-gray-200 rounded mt-2 w-2/3 animate-pulse" />
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  }

  return (
    <View className="space-y-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Priority Contacts
          </Text>
          <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Button
          title="Add Contact"
          variant="primary"
          size="sm"
          onPress={() => setShowAddModal(true)}
          leftIcon={<Ionicons name="add" size={16} color="white" />}
        />
      </View>

      {/* Empty State */}
      {contacts.length === 0 && (
        <Card className="p-6">
          <View className="items-center">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
              isDark ? 'bg-dark-700' : 'bg-gray-100'
            }`}>
              <Ionicons name="star-outline" size={32} color={isDark ? '#80848e' : '#6b7280'} />
            </View>
            <Text className={`font-semibold text-center mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              No Priority Contacts
            </Text>
            <Text className={`text-sm text-center ${
              isDark ? 'text-dark-400' : 'text-gray-500'
            }`}>
              Add important contacts to ensure you never miss their notifications
            </Text>
          </View>
        </Card>
      )}

      {/* Contact List */}
      {contacts.map((contact) => (
        <ContactItem
          key={contact.userId}
          contact={contact}
          onUpdate={updateContact}
          onRemove={removeContact}
          isDark={isDark}
        />
      ))}

      {/* Add Contact Modal/Sheet */}
      {showAddModal && (
        <Card className="p-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Add Priority Contact
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={isDark ? '#80848e' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className={`flex-row items-center rounded-lg mb-4 px-3 py-2 ${
            isDark ? 'bg-dark-700' : 'bg-gray-100'
          }`}>
            <Ionicons name="search" size={20} color={isDark ? '#80848e' : '#6b7280'} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users..."
              placeholderTextColor={isDark ? '#80848e' : '#6b7280'}
              className={`flex-1 ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
            />
          </View>

          {/* User List */}
          <FlatList
            data={filteredUsers.slice(0, 10)} // Limit to first 10 results
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => addContact(item)}
                className={`flex-row items-center p-3 rounded-lg ${
                  isDark ? 'bg-dark-800' : 'bg-white'
                }`}
              >
                <View className={`w-8 h-8 rounded-full items-center justify-center ${
                  isDark ? 'bg-dark-600' : 'bg-gray-200'
                }`}>
                  <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.displayName[0].toUpperCase()}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.displayName}
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                    @{item.username}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#3b82f6" />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={() => (
              <Text className={`text-center py-4 ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                No users found
              </Text>
            )}
            style={{ maxHeight: 300 }}
          />
        </Card>
      )}
    </View>
  );
}

export default PriorityContactsManager;