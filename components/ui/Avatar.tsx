import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'idle' | 'dnd' | 'invisible';
  showStatus?: boolean;
  style?: any;
}

// Size mapping for named sizes
const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
} as const;

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, status, showStatus, style }) => {
  // Convert named size to number
  const actualSize = typeof size === 'string' ? SIZE_MAP[size] : size;
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const backgroundColor = name
    ? `hsl(${hashCode(name) % 360}, 60%, 60%)`
    : '#888';

  const statusColors = {
    online: '#23a55a',
    idle: '#f0b132',
    dnd: '#f23f42',
    offline: '#80848e',
    invisible: '#80848e',
  };

  return (
    <View style={[styles.container, { width: actualSize, height: actualSize, borderRadius: actualSize / 2 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor }]}>
          <Text style={[styles.initials, { fontSize: actualSize * 0.4 }]}>{initials}</Text>
        </View>
      )}
      {showStatus && status && (
        <View
          style={[
            styles.statusIndicator,
            {
              backgroundColor: statusColors[status],
              width: actualSize * 0.3,
              height: actualSize * 0.3,
              borderRadius: (actualSize * 0.3) / 2,
              bottom: -2,
              right: -2,
            },
          ]}
        />
      )}
    </View>
  );
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

interface AvatarGroupProps {
  users: Array<{ uri?: string; name?: string }>;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  max?: number;
  style?: any;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ users, size = 40, max = 3, style }) => {
  // Convert named size to number
  const actualSize = typeof size === 'string' ? SIZE_MAP[size] : size;
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {displayUsers.map((user, idx) => (
        <View
          key={idx}
          style={[
            { marginLeft: idx > 0 ? -(actualSize * 0.3) : 0 },
            { zIndex: displayUsers.length - idx },
          ]}
        >
          <Avatar uri={user.uri} name={user.name} size={actualSize} style={{ borderWidth: 2, borderColor: '#fff' }} />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.container,
            {
              width: actualSize,
              height: actualSize,
              borderRadius: actualSize / 2,
              marginLeft: -(actualSize * 0.3),
              zIndex: 0,
              borderWidth: 2,
              borderColor: '#fff',
            },
          ]}
        >
          <View style={[styles.placeholder, { backgroundColor: '#888' }]}>
            <Text style={[styles.initials, { fontSize: actualSize * 0.4 }]}>+{remaining}</Text>
          </View>
        </View>
      )}
    </View>
  );
};
