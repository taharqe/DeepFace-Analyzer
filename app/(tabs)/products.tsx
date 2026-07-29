import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard, Text } from '../../src/components';
import { PRODUCTS } from '../../src/features/catalogue/data';
import { isMeasuredBand } from '../../src/features/catalogue/match';
import { useTheme } from '../../src/theme';

export default function Products() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  // Only products in a band the design system has a measured colour for.
  // See match.ts - there is no measured colour below 70%.
  const shown = PRODUCTS.filter((p) => isMeasuredBand(p.score)).sort(
    (a, b) => b.score - a.score,
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 140,
          gap: t.spacing.md,
        }}
      >
        <Text variant="title.lg">Products</Text>
        <Text variant="body.lg" tone="secondary">
          Ranked by how well each one fits your answers.
        </Text>

        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ScrollView>
    </View>
  );
}
