import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { Scrim } from './Scrim';

/**
 * Bottom sheet.
 *
 * Corner radius is `lg` (22) - the section/tile step. The capsule token is for
 * rows and controls, not for panels; a capsule-cornered sheet would read as an
 * oversized pill.
 *
 * [E] Entry and exit motion are not observable in a still. The spec marks
 *     motion as estimated throughout. This renders presence only - no
 *     animation is asserted here, because asserting one would be inventing a
 *     measurement.
 */
export interface SheetProps {
  visible: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
}

export function Sheet({ visible, onDismiss, children }: SheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Scrim variant="sheet" onPress={onDismiss} />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: t.color.palette.surface,
            borderTopLeftRadius: t.radius.lg,
            borderTopRightRadius: t.radius.lg,
            padding: t.spacing.lg,
            paddingBottom: insets.bottom + t.spacing.lg,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
