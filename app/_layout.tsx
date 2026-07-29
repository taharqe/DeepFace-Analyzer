import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, palette } from '../src/theme';
import { OnboardingProvider } from '../src/features/onboarding/state';

/**
 * Root layout.
 *
 * Headers are off everywhere. The corpus has no native navigation bar on any
 * of the 50 screens - titles are page content (title.lg), not chrome.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <OnboardingProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.canvas },
              animation: 'slide_from_right',
            }}
          />
          <StatusBar style="dark" />
        </OnboardingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
