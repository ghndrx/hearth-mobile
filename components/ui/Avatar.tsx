import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  style?: any;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, style }) => {
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

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
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
});

interface AvatarGroupProps {
  users: Array<{ uri?: string; name?: string }>;
  size?: number;
  max?: number;
  style?: any;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ users, size = 40, max = 3, style }) => {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {displayUsers.map((user, idx) => (
        <View
          key={idx}
          style={[
            { marginLeft: idx > 0 ? -(size * 0.3) : 0 },
            { zIndex: displayUsers.length - idx },
          ]}
        >
          <Avatar uri={user.uri} name={user.name} size={size} style={{ borderWidth: 2, borderColor: '#fff' }} />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -(size * 0.3),
              zIndex: 0,
              borderWidth: 2,
              borderColor: '#fff',
            },
          ]}
        >
          <View style={[styles.placeholder, { backgroundColor: '#888' }]}>
            <Text style={[styles.initials, { fontSize: size * 0.4 }]}>+{remaining}</Text>
          </View>
        </View>
      )}
    </View>
  );
};
