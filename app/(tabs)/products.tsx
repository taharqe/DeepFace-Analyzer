import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ProductCard, Text, useStickyDockHeight } from '../../src/components';
import {
  CATALOGUE_PLACEHOLDER_DISCLOSURE,
  SCORABLE_PRODUCTS,
} from '../../src/features/catalogue/products';
import { FIT_SCORE_DISCLOSURE, rankProducts } from '../../src/features/routine';
import { useOnboarding } from '../../src/features/onboarding/state';
import { useTheme } from '../../src/theme';
import { TAB_ITEM_HEIGHT } from './_layout';

/**
 * Products, ranked by a fit score COMPUTED for this user.
 *
 * Until now this screen read a `score` literal off each product - the same
 * "99% fit" for every person who ever opened the app, derived from nothing.
 * The onboarding answers reached no consumer at all. They do now: concerns and
 * age band go into the routine engine, which returns a per-product breakdown.
 *
 * Both disclosures below are rendered, not merely defined. The score is a
 * ranking heuristic over the user's own answers - not an efficacy figure - and
 * the catalogue is representative placeholder data, not a licensed product
 * database. Neither claim survives being left in a constant nobody reads.
 */
export default function Products() {
  const t = useTheme();
  const dockClearance = useStickyDockHeight(TAB_ITEM_HEIGHT, 8);
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();

  const ranked = useMemo(
    () =>
      rankProducts(SCORABLE_PRODUCTS, {
        concerns: state.concerns,
        age: state.age,
      }),
    [state.concerns, state.age],
  );

  const answered = state.concerns.length > 0 || state.age !== null;

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: dockClearance + t.spacing.xl,
          gap: t.spacing.md,
        }}
      >
        <Text variant="title.lg">Products</Text>
        <Text variant="body.lg" tone="secondary">
          {answered
            ? 'Ranked by how well each one lines up with your answers.'
            : 'Answer a few questions and this list reorders around you.'}
        </Text>

        {ranked.map(({ product, breakdown }) => (
          <ProductCard
            key={product.id}
            product={product}
            score={breakdown.total}
          />
        ))}

        <Card>
          <Text variant="caption" tone="secondary">
            {FIT_SCORE_DISCLOSURE}
          </Text>
          <Text
            variant="caption"
            tone="secondary"
            style={{ marginTop: t.spacing.sm }}
          >
            {CATALOGUE_PLACEHOLDER_DISCLOSURE}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
