import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from 'expo-router/ui';

import { StickyDock, Text } from '../../src/components';
import { useTheme } from '../../src/theme';

/**
 * The five-item dock: Today / Products / Scan / Insights / You.
 *
 * Built on expo-router's headless `Tabs` (expo-router/ui) rather than
 * `NativeTabs`. The native tab bar renders the platform's own chrome - its
 * height, blur, and label treatment are UIKit's, not measured from the
 * captures. Since the whole point of this system is that every value is
 * traceable to a measurement, the dock is composed from our own StickyDock.
 *
 * [M] Glyphs are read off the captures. They are geometric marks, not an icon
 *     family - the spec's terms exclude reproducing the source's icon artwork,
 *     so these stand in for whatever the real set is.
 *
 * The active item is indigo. This is the one place where selection and
 * commitment could plausibly blur, and it resolves toward indigo: the tab you
 * are on states where the app IS, rather than previewing a choice.
 */
const TABS = [
  { name: 'today', href: '/today', glyph: '◗', label: 'Today' },
  { name: 'products', href: '/products', glyph: '◫', label: 'Products' },
  { name: 'scan', href: '/scan', glyph: '⌂', label: 'Scan' },
  { name: 'insights', href: '/insights', glyph: '◍', label: 'Insights' },
  { name: 'you', href: '/you', glyph: '◯', label: 'You' },
] as const;

type DockItemProps = TabTriggerSlotProps & {
  glyph: string;
  label: string;
};

const DockItem = forwardRef<View, DockItemProps>(
  ({ glyph, label, isFocused, ...props }, ref) => {
    const t = useTheme();
    const color = isFocused
      ? t.color.palette.actionPrimary
      : t.color.text.secondary;

    return (
      <Pressable
        ref={ref}
        {...props}
        accessibilityRole="tab"
        accessibilityState={{ selected: !!isFocused }}
        accessibilityLabel={label}
        style={styles.item}
      >
        <Text variant="title.sm" style={{ color }}>
          {glyph}
        </Text>
        <Text variant="caption" style={{ color }}>
          {label}
        </Text>
      </Pressable>
    );
  },
);
DockItem.displayName = 'DockItem';

export default function TabsLayout() {
  const t = useTheme();

  return (
    <Tabs>
      <TabSlot />
      {/*
        The TabTriggers must be DIRECT children of the element TabList wraps.
        expo-router's parseTriggersFromChildren unwraps one layer beneath
        `asChild` and no more, so a row <View> in between makes the navigator
        find zero screens. StickyDock takes `row` for exactly this reason.
      */}
      <TabList asChild>
        <StickyDock row bottomInset={t.spacing.sm}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <DockItem glyph={tab.glyph} label={tab.label} />
            </TabTrigger>
          ))}
        </StickyDock>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 2 },
});
