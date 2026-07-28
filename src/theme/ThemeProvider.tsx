import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { onFill, palette, successGradient, text, voidGradient } from './color';
import { shadow, scrim } from './elevation';
import { OPTION_ROW_HEIGHT, radius } from './radius';
import { PX_PER_PT } from './scale';
import { spacing } from './spacing';
import { fontFamily, typography } from './typography';

/**
 * AURA theme.
 *
 * Reconstructed from the v0.1.0 measurement spec, not from the original
 * source - the ThemeProvider.tsx upload arrived as an iCloud placeholder.
 * Diff this against the original when it lands.
 *
 * [E] There is no dark theme here. The capture set is 50 light-mode screens
 *     and app.json pins userInterfaceStyle to light, so a dark palette would
 *     be invention rather than measurement. When one is needed it should be
 *     measured the same way, not computed by inverting these values - the
 *     two-accent rule and the ink-on-fill contrast fixes will not survive a
 *     mechanical inversion.
 */
export const theme = {
  color: { palette, onFill, text, voidGradient, successGradient },
  typography,
  fontFamily,
  spacing,
  radius,
  shadow,
  scrim,
  metrics: { pxPerPt: PX_PER_PT, optionRowHeight: OPTION_ROW_HEIGHT },
} as const;

export type Theme = typeof theme;

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({
  children,
  value,
}: {
  children: ReactNode;
  /** Override for tests and visual regression. Merged shallowly over the base. */
  value?: Partial<Theme>;
}) {
  const merged = useMemo(
    () => (value ? ({ ...theme, ...value } as Theme) : theme),
    [value],
  );
  return <ThemeContext.Provider value={merged}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
