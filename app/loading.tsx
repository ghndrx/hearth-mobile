import { useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingSpinner } from "../components/ui";

export default function LoadingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView
      className={`flex-1 items-center justify-center ${
        isDark ? "bg-dark-900" : "bg-white"
      }`}
    >
      <LoadingSpinner
        size="large"
        text="Loading Hearth..."
        fullScreen={false}
      />
    </SafeAreaView>
  );
}
