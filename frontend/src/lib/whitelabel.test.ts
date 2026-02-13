import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadWhiteLabelConfig,
  getBrand,
  getDomains,
  getFeatures,
  isFeatureEnabled,
  getBrandCSSVars,
  filterNavByFeatures,
  validateConfig,
  resetConfig,
} from './whitelabel.js';

describe('whitelabel', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  describe('loadWhiteLabelConfig', () => {
    it('returns default configuration', () => {
      const config = loadWhiteLabelConfig();
      expect(config.brand.app_name).toBe('nfamily');
      expect(config.brand.app_display_name).toBe('ɳFamily');
    });

    it('caches configuration after first load', () => {
      const config1 = loadWhiteLabelConfig();
      const config2 = loadWhiteLabelConfig();
      expect(config1).toBe(config2);
    });

    it('reads brand overrides from env', () => {
      process.env.NEXT_PUBLIC_APP_NAME = 'myfamilyapp';
      process.env.NEXT_PUBLIC_APP_DISPLAY_NAME = 'My Family App';
      resetConfig();
      const config = loadWhiteLabelConfig();
      expect(config.brand.app_name).toBe('myfamilyapp');
      expect(config.brand.app_display_name).toBe('My Family App');
    });

    it('reads domain config from env', () => {
      process.env.NEXT_PUBLIC_APP_DOMAIN = 'custom.example.com';
      resetConfig();
      const config = loadWhiteLabelConfig();
      expect(config.domains.app_domain).toBe('custom.example.com');
    });

    it('reads feature flags from env', () => {
      process.env.NEXT_PUBLIC_ENABLE_CHAT = 'false';
      process.env.NEXT_PUBLIC_ENABLE_ISLAMIC_MODE = 'true';
      resetConfig();
      const config = loadWhiteLabelConfig();
      expect(config.features.enable_chat).toBe(false);
      expect(config.features.enable_islamic_mode).toBe(true);
    });

    it('reads locale settings from env', () => {
      process.env.NEXT_PUBLIC_DEFAULT_LOCALE = 'ar';
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'en,ar,fr';
      resetConfig();
      const config = loadWhiteLabelConfig();
      expect(config.locale.default_locale).toBe('ar');
      expect(config.locale.supported_locales).toEqual(['en', 'ar', 'fr']);
    });

    it('reads limit settings from env', () => {
      process.env.NEXT_PUBLIC_MAX_FAMILY_MEMBERS = '100';
      process.env.NEXT_PUBLIC_MAX_MEDIA_UPLOAD_MB = '250';
      resetConfig();
      const config = loadWhiteLabelConfig();
      expect(config.limits.max_family_members).toBe(100);
      expect(config.limits.max_media_upload_mb).toBe(250);
    });
  });

  describe('getBrand', () => {
    it('returns brand configuration', () => {
      const brand = getBrand();
      expect(brand.primary_color).toBe('#2563eb');
      expect(brand.copyright_holder).toBe('ɳSelf');
    });
  });

  describe('getDomains', () => {
    it('returns domain configuration', () => {
      const domains = getDomains();
      expect(domains.api_domain).toBeTruthy();
      expect(domains.auth_domain).toBeTruthy();
    });
  });

  describe('getFeatures', () => {
    it('returns feature flags', () => {
      const features = getFeatures();
      expect(typeof features.enable_signup).toBe('boolean');
      expect(typeof features.enable_chat).toBe('boolean');
    });
  });

  describe('isFeatureEnabled', () => {
    it('checks feature flags correctly', () => {
      expect(typeof isFeatureEnabled('enable_signup')).toBe('boolean');
      expect(typeof isFeatureEnabled('demo_mode')).toBe('boolean');
    });

    it('reflects env overrides', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      resetConfig();
      expect(isFeatureEnabled('demo_mode')).toBe(true);
    });
  });

  describe('getBrandCSSVars', () => {
    it('returns CSS custom properties', () => {
      const vars = getBrandCSSVars();
      expect(vars['--brand-primary']).toBe('#2563eb');
      expect(vars['--brand-secondary']).toBe('#475569');
      expect(vars['--brand-accent']).toBe('#f59e0b');
      expect(vars['--brand-font']).toContain('system-ui');
    });

    it('reflects custom colors from env', () => {
      process.env.NEXT_PUBLIC_PRIMARY_COLOR = '#ff0000';
      resetConfig();
      const vars = getBrandCSSVars();
      expect(vars['--brand-primary']).toBe('#ff0000');
    });
  });

  describe('filterNavByFeatures', () => {
    const allItems = [
      { href: '/feed', label: 'Feed' },
      { href: '/chat', label: 'Chat' },
      { href: '/vault', label: 'Vault' },
      { href: '/tv', label: 'TV' },
      { href: '/recipes', label: 'Recipes' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/location', label: 'Location' },
      { href: '/search', label: 'Search' },
      { href: '/devices', label: 'Devices' },
      { href: '/admin', label: 'Admin' },
    ] as const;

    it('returns all items when all features enabled', () => {
      const filtered = filterNavByFeatures(allItems);
      expect(filtered).toHaveLength(allItems.length);
    });

    it('filters out chat when disabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_CHAT = 'false';
      resetConfig();
      const filtered = filterNavByFeatures(allItems);
      expect(filtered.find((i) => i.href === '/chat')).toBeUndefined();
    });

    it('filters out vault when disabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_LEGACY_VAULT = 'false';
      resetConfig();
      const filtered = filterNavByFeatures(allItems);
      expect(filtered.find((i) => i.href === '/vault')).toBeUndefined();
    });

    it('keeps items without feature flags (feed, admin)', () => {
      process.env.NEXT_PUBLIC_ENABLE_CHAT = 'false';
      process.env.NEXT_PUBLIC_ENABLE_LEGACY_VAULT = 'false';
      process.env.NEXT_PUBLIC_ENABLE_TV = 'false';
      resetConfig();
      const filtered = filterNavByFeatures(allItems);
      expect(filtered.find((i) => i.href === '/feed')).toBeDefined();
      expect(filtered.find((i) => i.href === '/admin')).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('returns no issues for default config', () => {
      const issues = validateConfig();
      expect(issues).toHaveLength(0);
    });

    it('detects invalid primary color format', () => {
      process.env.NEXT_PUBLIC_PRIMARY_COLOR = 'not-a-color';
      resetConfig();
      const issues = validateConfig();
      expect(issues).toContain('Invalid primary_color format');
    });

    it('detects invalid secondary color format', () => {
      process.env.NEXT_PUBLIC_SECONDARY_COLOR = 'red';
      resetConfig();
      const issues = validateConfig();
      expect(issues).toContain('Invalid secondary_color format');
    });

    it('detects invalid family member limit', () => {
      process.env.NEXT_PUBLIC_MAX_FAMILY_MEMBERS = '1';
      resetConfig();
      const issues = validateConfig();
      expect(issues).toContain('max_family_members must be >= 2');
    });

    it('detects invalid media upload limit', () => {
      process.env.NEXT_PUBLIC_MAX_MEDIA_UPLOAD_MB = '0';
      resetConfig();
      const issues = validateConfig();
      expect(issues).toContain('max_media_upload_mb must be >= 1');
    });
  });

  describe('resetConfig', () => {
    it('clears cached configuration', () => {
      const config1 = loadWhiteLabelConfig();
      process.env.NEXT_PUBLIC_APP_NAME = 'changed';
      resetConfig();
      const config2 = loadWhiteLabelConfig();
      expect(config2.brand.app_name).toBe('changed');
      expect(config1.brand.app_name).not.toBe(config2.brand.app_name);
    });
  });
});
