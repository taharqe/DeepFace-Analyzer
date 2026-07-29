import { View, StyleSheet } from 'react-native';

import { useTheme } from '../../theme';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../features/catalogue/types';
import { Badge, Card, Text } from '../primitives';
import { ScoreBadge } from './ScoreBadge';

/**
 * Product tile.
 *
 * Type roles come straight from the specimen strings in the spec:
 *   title.sm  "Soy Face Cleanser"   product name
 *   caption   "Peach & Lily"        brand
 *   label.md  "99% fit"             score badge
 *
 * The price uses the commerce yellow, which the spec restricts to price pills
 * and nothing else.
 */
export interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTheme();

  return (
    <Card>
      <View style={[styles.headRow, { marginBottom: t.spacing.sm }]}>
        <View style={styles.grow}>
          <Text variant="caption" tone="secondary">
            {product.brand}
          </Text>
          <Text variant="title.sm">{product.name}</Text>
        </View>
        <ScoreBadge score={product.score} />
      </View>

      <View style={[styles.metaRow, { gap: t.spacing.sm }]}>
        <Badge
          label={formatPrice(product.priceMinor, product.currency)}
          tone="commerce"
        />
        {product.attributes.map((a) => (
          <Badge key={a} label={a} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
