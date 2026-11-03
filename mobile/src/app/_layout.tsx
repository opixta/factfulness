import {
  Fraunces_500Medium,
  Fraunces_700Bold,
  useFonts as useFraunces,
} from "@expo-google-fonts/fraunces";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts as useOutfit,
} from "@expo-google-fonts/outfit";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { FactfulnessProvider } from "@/context/FactfulnessContext";
import { Colors } from "@/theme/brand";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [frauncesLoaded] = useFraunces({
    Fraunces_500Medium,
    Fraunces_700Bold,
  });
  const [outfitLoaded] = useOutfit({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (frauncesLoaded && outfitLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [frauncesLoaded, outfitLoaded]);

  if (!frauncesLoaded || !outfitLoaded) {
    return null;
  }

  return (
    <FactfulnessProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.paper },
          headerTintColor: Colors.tealDeep,
          headerTitleStyle: { fontFamily: "Outfit_600SemiBold" },
          contentStyle: { backgroundColor: Colors.paper },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="topic/[id]"
          options={{ title: "토픽", headerBackTitle: "목록" }}
        />
        <Stack.Screen
          name="claim/[id]"
          options={{ title: "명제", headerBackTitle: "토픽" }}
        />
        <Stack.Screen
          name="new-topic"
          options={{ title: "토픽 제안", presentation: "modal" }}
        />
        <Stack.Screen
          name="new-claim/[topicId]"
          options={{ title: "세부 명제 제안", presentation: "modal" }}
        />
      </Stack>
    </FactfulnessProvider>
  );
}
