/**
 * The captures show "€5,99" and "€39,99" - symbol LEADING, comma decimal, no
 * space between.
 *
 * No locale emits that. `Intl.NumberFormat('de-DE', {style:'currency'})` gives
 * "5,99 €" with the symbol trailing; nl-NL gives "€ 39,99" with a non-breaking
 * space. So the currency pattern is assembled here rather than delegated: the
 * locale formats the NUMBER, and the symbol is placed by us.
 *
 * An earlier version used style:'currency' and shipped "39,99 €" on the paywall
 * and the price pill, directly contradicting the spec copy this comment claims
 * to satisfy.
 */
const DEFAULT_LOCALE = 'de-DE';

const SYMBOL: Record<'EUR', string> = { EUR: '€' };

export function formatPrice(
  minor: number,
  currency: 'EUR' = 'EUR',
  locale: string = DEFAULT_LOCALE,
): string {
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
  return `${SYMBOL[currency]}${value}`;
}

/**
 * Group-separated count, for anywhere a number is read rather than counted.
 *
 * NOT used for the catalogue size on the tailoring screen - see rawCount.
 */
export function formatCount(n: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(n);
}

/**
 * Unseparated digits.
 *
 * The tailoring screen's capture reads "47750", not "47.750". The number there
 * is animating upward rather than being read as a quantity, and a separator
 * that appears partway through the count (at 1,000) makes the digits jump
 * sideways mid-animation. Matching the capture and avoiding the reflow happen
 * to be the same decision.
 */
export function rawCount(n: number): string {
  return String(Math.round(n));
}
