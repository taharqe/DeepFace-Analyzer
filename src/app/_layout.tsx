import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { HistoryProvider } from '@/lib/store';
import { accent, line, surface, text } from '@/theme/tokens';

/**
 * The app commits to a dark world rather than following the system setting: the
 * result surfaces render photography against confidence meters, and that
 * contrast relationship only holds on a dark backdrop.
 */
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: surface.base,
    card: surface.base,
    text: text.primary,
    border: line.core,
    primary: accent.violet,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <HistoryProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: surface.base },
          }}
        />
      </HistoryProvider>
    </ThemeProvider>
  );
}
