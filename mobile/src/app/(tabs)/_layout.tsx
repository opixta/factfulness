import { Tabs } from "expo-router";

import { BrandMark } from "@/components/ui";
import { Colors, Fonts } from "@/theme/brand";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tealDeep,
        tabBarInactiveTintColor: Colors.inkSoft,
        tabBarStyle: {
          backgroundColor: Colors.paper,
          borderTopColor: Colors.line,
        },
        headerStyle: { backgroundColor: Colors.paper },
        headerTintColor: Colors.tealDeep,
        headerTitleStyle: { fontFamily: Fonts.uiSemiBold },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "탐색",
          tabBarIcon: () => <BrandMark size={16} />,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: "점수 규칙",
          tabBarIcon: () => <BrandMark size={16} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: () => <BrandMark size={16} />,
        }}
      />
    </Tabs>
  );
}
