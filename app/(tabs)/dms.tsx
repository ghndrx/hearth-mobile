import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DMsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1e1f22]">
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-xl font-semibold text-gray-900 dark:text-white">
          Direct Messages
        </Text>
        <Text className="mt-2 text-gray-500 dark:text-gray-400">
          Your conversations will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}
