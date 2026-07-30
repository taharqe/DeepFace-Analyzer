import { Tabs } from 'expo-router';

import { Glyph } from '@/components/glyph';
import { accent, line, surface, text } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent.violet,
        tabBarInactiveTintColor: text.tertiary,
        tabBarStyle: {
          backgroundColor: surface.core,
          borderTopColor: line.core,
          // The default hairline is invisible against a near-black bar.
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.2 },
        sceneStyle: { backgroundColor: surface.base },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Analyze',
          tabBarIcon: ({ color }) => <Glyph name="sparkles" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <Glyph name="clock.arrow.circlepath" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color }) => <Glyph name="info.circle" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
