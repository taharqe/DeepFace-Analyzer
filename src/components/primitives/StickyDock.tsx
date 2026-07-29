import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

/**
 * Reconstructed from the AURA v0.1.0 spec - the StickyDock.tsx upload arrived
 * as an iCloud placeholder.
 *
 * AMBIGUITY, flagged rather than resolved: the corpus has two things pinned to
 * the bottom edge - the CTA dock that gates multi-select steps ("Continue"),
 * and the five-item tab bar (Today / Products / Scan / Insights / You). The
 * spec names neither "StickyDock", so which one the original file was is not
 * recoverable from what I have.
 *
 * This is built as the layout primitive underneath both: a bottom-pinned
 * surface that owns safe-area inset, background, and the measured shadow, and
 * takes arbitrary children. If the original was specifically the tab bar, this
 * is still the right base to build it on - and the diff will be small.
 */

export interface StickyDockProps {
  children: React.ReactNode;
  /**
   * Canvas rather than surface. Use when the dock sits over a scrolling list
   * and should read as part of the page rather than as a raised layer.
   */
  transparent?: boolean;
  /**
   * Extra bottom padding above the safe-area inset. Defaults to 16pt.
   */
  bottomInset?: number;
  /**
   * Lay children out in a row, evenly distributed.
   *
   * Required by the tab bar, and not merely cosmetic: expo-router's
   * `parseTriggersFromChildren` unwraps exactly ONE layer beneath
   * `<TabList asChild>`, so the `<TabTrigger>`s have to be direct children of
   * this component. An intermediate row `<View>` silently hides them and the
   * navigator throws "Couldn't find any screens".
   */
  row?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StickyDock({
  children,
  transparent = false,
  bottomInset,
  row = false,
  style,
}: StickyDockProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const pad = bottomInset ?? t.spacing.lg;

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: transparent
            ? t.color.palette.canvas
            : t.color.palette.surface,
          paddingHorizontal: t.spacing.lg,
          paddingTop: t.spacing.lg,
          // The inset is added, not substituted - a device with no home
          // indicator still needs the 16pt breathing room.
          paddingBottom: insets.bottom + pad,
        },
        row && styles.row,
        // The same single measured shadow as every other raised surface.
        // The corpus has exactly one; there is no "dock shadow".
        !transparent && t.shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
