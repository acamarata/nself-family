export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/**
 * Load messages for a given locale.
 * @param locale - The locale code
 * @returns Translation messages
 */
export async function getMessages(locale: Locale = defaultLocale) {
  return (await import(`./messages/${locale}.json`)).default;
}
