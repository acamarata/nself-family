import { describe, it, expect } from 'vitest';
import { locales, defaultLocale, getMessages } from './config';

describe('i18n config', () => {
  it('has en and ar locales', () => {
    expect(locales).toContain('en');
    expect(locales).toContain('ar');
  });

  it('defaults to English', () => {
    expect(defaultLocale).toBe('en');
  });

  it('loads English messages', async () => {
    const messages = await getMessages('en');
    expect(messages.app.name).toBe('ɳFamily');
    expect(messages.nav.feed).toBe('Feed');
  });

  it('loads Arabic messages', async () => {
    const messages = await getMessages('ar');
    expect(messages.app.name).toBe('ɳFamily');
    expect(messages.nav.feed).toBe('الخلاصة');
  });

  it('loads default locale when called without args', async () => {
    const messages = await getMessages();
    expect(messages.app.name).toBe('ɳFamily');
  });
});
