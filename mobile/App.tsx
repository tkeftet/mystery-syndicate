import React, { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from "@expo-google-fonts/dm-serif-display";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from "@expo-google-fonts/space-mono";
import { RootNavigator } from "./src/navigation";
import { useAuthStore } from "./src/features/auth/auth.store";
import {
  OnboardingScreen,
  isOnboardingDone,
} from "./src/features/auth/screens/OnboardingScreen";
import { LoadingScreen } from "./src/screens/LoadingScreen";
import { queryClient } from "./src/services/queryClient";
import { syncPushToken } from "./src/services/notifications";
import { initializeAds } from "./src/services/ads";
import { heartbeatApi } from "./src/features/friends/friends.service";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { initMonitoring } from "./src/services/monitoring";

function AppContent() {
  const { loadFromStorage, isAuthenticated } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    initMonitoring();
    loadFromStorage();
    initializeAds();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      isOnboardingDone().then(setOnboardingDone);
      // Register for push + send the Expo token to the backend (no-op in Expo Go).
      syncPushToken();
      // Presence heartbeat: mark online now, then every 60s while the app is open.
      heartbeatApi();
      const id = setInterval(heartbeatApi, 60_000);
      return () => clearInterval(id);
    }
  }, [isAuthenticated]);

  // Show onboarding only after first login
  if (isAuthenticated && onboardingDone === false) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  return <RootNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay: DMSerifDisplay_400Regular,
    "DMSerifDisplay-Italic": DMSerifDisplay_400Regular_Italic,
    "SpaceGrotesk-Regular": SpaceGrotesk_400Regular,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    "SpaceGrotesk-SemiBold": SpaceGrotesk_600SemiBold,
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
    SpaceMono: SpaceMono_400Regular,
    "SpaceMono-Bold": SpaceMono_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            {fontsLoaded ? <AppContent /> : <LoadingScreen />}
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
