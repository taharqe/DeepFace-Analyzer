/**
 * The captures show "€5,99" and "€39,99" - comma decimal separator, symbol
 * leading. That is the de-DE / fr-FR convention, not en-IE, so the locale is
 * doing real work here and should not be hardcoded to the device default.
 */
const DEFAULT_LOCALE = 'de-DE';

export function formatPrice(
  minor: number,
  currency: 'EUR' = 'EUR',
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(minor / 100);
}

/** "47750" -> "47,750" in the active locale. */
export function formatCount(n: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(n);
}
