'use client';

import { useState } from 'react';
import { locales, type Locale } from '@/i18n/config';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};

/**
 * Language switcher dropdown.
 */
export function LanguageSwitcher() {
  const [current, setCurrent] = useState<Locale>('en');

  function handleChange(locale: Locale) {
    setCurrent(locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value as Locale)}
      className="input w-auto"
      aria-label="Select language"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
