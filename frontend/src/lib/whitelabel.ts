/**
 * White-label configuration system — allows deployment customization without code changes.
 */

export interface BrandConfig {
  app_name: string;
  app_display_name: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  support_email?: string;
  website_url?: string;
  copyright_holder: string;
}

export interface DomainConfig {
  app_domain: string;
  api_domain: string;
  auth_domain: string;
  ws_domain: string;
  storage_domain?: string;
}

export interface FeatureFlags {
  enable_signup: boolean;
  enable_islamic_mode: boolean;
  enable_legacy_vault: boolean;
  enable_chat: boolean;
  enable_tv_integration: boolean;
  enable_location_sharing: boolean;
  enable_recipes: boolean;
  enable_calendar: boolean;
  enable_trips: boolean;
  enable_search: boolean;
  enable_devices: boolean;
  enable_offline_mode: boolean;
  enable_genealogy: boolean;
  enable_albums: boolean;
  demo_mode: boolean;
}

export interface WhiteLabelConfig {
  brand: BrandConfig;
  domains: DomainConfig;
  features: FeatureFlags;
  locale: {
    default_locale: string;
    supported_locales: string[];
    rtl_locales: string[];
  };
  limits: {
    max_family_members: number;
    max_media_upload_mb: number;
    max_vault_items: number;
    max_conversations: number;
  };
}

const DEFAULT_BRAND: BrandConfig = {
  app_name: 'nfamily',
  app_display_name: 'ɳFamily',
  primary_color: '#2563eb',
  secondary_color: '#475569',
  accent_color: '#f59e0b',
  font_family: 'system-ui, -apple-system, sans-serif',
  copyright_holder: 'ɳSelf',
};

function getDefaultDomains(): DomainConfig {
  return {
    app_domain: process.env.NEXT_PUBLIC_APP_DOMAIN || 'family.local.nself.org',
    api_domain: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    auth_domain: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:4000',
    ws_domain: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  };
}

function getDefaultFeatures(): FeatureFlags {
  return {
    enable_signup: process.env.NEXT_PUBLIC_ENABLE_SIGNUP !== 'false',
    enable_islamic_mode: process.env.NEXT_PUBLIC_ENABLE_ISLAMIC_MODE === 'true',
    enable_legacy_vault: process.env.NEXT_PUBLIC_ENABLE_LEGACY_VAULT !== 'false',
    enable_chat: process.env.NEXT_PUBLIC_ENABLE_CHAT !== 'false',
    enable_tv_integration: process.env.NEXT_PUBLIC_ENABLE_TV !== 'false',
    enable_location_sharing: process.env.NEXT_PUBLIC_ENABLE_LOCATION !== 'false',
    enable_recipes: process.env.NEXT_PUBLIC_ENABLE_RECIPES !== 'false',
    enable_calendar: process.env.NEXT_PUBLIC_ENABLE_CALENDAR !== 'false',
    enable_trips: process.env.NEXT_PUBLIC_ENABLE_TRIPS !== 'false',
    enable_search: process.env.NEXT_PUBLIC_ENABLE_SEARCH !== 'false',
    enable_devices: process.env.NEXT_PUBLIC_ENABLE_DEVICES !== 'false',
    enable_offline_mode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE !== 'false',
    enable_genealogy: process.env.NEXT_PUBLIC_ENABLE_GENEALOGY !== 'false',
    enable_albums: process.env.NEXT_PUBLIC_ENABLE_ALBUMS !== 'false',
    demo_mode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  };
}

let _config: WhiteLabelConfig | null = null;

/**
 * Load white-label configuration from environment variables.
 * @returns Resolved white-label configuration
 */
export function loadWhiteLabelConfig(): WhiteLabelConfig {
  if (_config) return _config;

  _config = {
    brand: {
      ...DEFAULT_BRAND,
      ...(process.env.NEXT_PUBLIC_APP_NAME && { app_name: process.env.NEXT_PUBLIC_APP_NAME }),
      ...(process.env.NEXT_PUBLIC_APP_DISPLAY_NAME && { app_display_name: process.env.NEXT_PUBLIC_APP_DISPLAY_NAME }),
      ...(process.env.NEXT_PUBLIC_LOGO_URL && { logo_url: process.env.NEXT_PUBLIC_LOGO_URL }),
      ...(process.env.NEXT_PUBLIC_FAVICON_URL && { favicon_url: process.env.NEXT_PUBLIC_FAVICON_URL }),
      ...(process.env.NEXT_PUBLIC_PRIMARY_COLOR && { primary_color: process.env.NEXT_PUBLIC_PRIMARY_COLOR }),
      ...(process.env.NEXT_PUBLIC_SECONDARY_COLOR && { secondary_color: process.env.NEXT_PUBLIC_SECONDARY_COLOR }),
      ...(process.env.NEXT_PUBLIC_ACCENT_COLOR && { accent_color: process.env.NEXT_PUBLIC_ACCENT_COLOR }),
      ...(process.env.NEXT_PUBLIC_FONT_FAMILY && { font_family: process.env.NEXT_PUBLIC_FONT_FAMILY }),
      ...(process.env.NEXT_PUBLIC_SUPPORT_EMAIL && { support_email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL }),
      ...(process.env.NEXT_PUBLIC_WEBSITE_URL && { website_url: process.env.NEXT_PUBLIC_WEBSITE_URL }),
      ...(process.env.NEXT_PUBLIC_COPYRIGHT_HOLDER && { copyright_holder: process.env.NEXT_PUBLIC_COPYRIGHT_HOLDER }),
    },
    domains: getDefaultDomains(),
    features: getDefaultFeatures(),
    locale: {
      default_locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en',
      supported_locales: (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES || 'en,ar').split(','),
      rtl_locales: (process.env.NEXT_PUBLIC_RTL_LOCALES || 'ar,he,fa,ur').split(','),
    },
    limits: {
      max_family_members: parseInt(process.env.NEXT_PUBLIC_MAX_FAMILY_MEMBERS || '50', 10),
      max_media_upload_mb: parseInt(process.env.NEXT_PUBLIC_MAX_MEDIA_UPLOAD_MB || '100', 10),
      max_vault_items: parseInt(process.env.NEXT_PUBLIC_MAX_VAULT_ITEMS || '500', 10),
      max_conversations: parseInt(process.env.NEXT_PUBLIC_MAX_CONVERSATIONS || '100', 10),
    },
  };

  return _config;
}

/**
 * Get the current brand configuration.
 * @returns Brand configuration
 */
export function getBrand(): BrandConfig {
  return loadWhiteLabelConfig().brand;
}

/**
 * Get the current domain configuration.
 * @returns Domain configuration
 */
export function getDomains(): DomainConfig {
  return loadWhiteLabelConfig().domains;
}

/**
 * Get the current feature flags.
 * @returns Feature flags
 */
export function getFeatures(): FeatureFlags {
  return loadWhiteLabelConfig().features;
}

/**
 * Check if a specific feature is enabled.
 * @param feature - Feature flag key
 * @returns True if the feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatures()[feature];
}

/**
 * Get CSS custom properties for brand theming.
 * @returns CSS custom properties object
 */
export function getBrandCSSVars(): Record<string, string> {
  const brand = getBrand();
  return {
    '--brand-primary': brand.primary_color,
    '--brand-secondary': brand.secondary_color,
    '--brand-accent': brand.accent_color,
    '--brand-font': brand.font_family,
  };
}

/**
 * Get filtered navigation items based on feature flags.
 * @param items - Full navigation item list
 * @returns Filtered items based on enabled features
 */
export function filterNavByFeatures<T extends { href: string }>(items: readonly T[]): T[] {
  const features = getFeatures();
  const featureMap: Record<string, keyof FeatureFlags> = {
    '/chat': 'enable_chat',
    '/vault': 'enable_legacy_vault',
    '/inheritance': 'enable_legacy_vault',
    '/tv': 'enable_tv_integration',
    '/location': 'enable_location_sharing',
    '/recipes': 'enable_recipes',
    '/meals': 'enable_recipes',
    '/calendar': 'enable_calendar',
    '/trips': 'enable_trips',
    '/search': 'enable_search',
    '/devices': 'enable_devices',
    '/albums': 'enable_albums',
    '/family/tree': 'enable_genealogy',
    '/family/genealogy': 'enable_genealogy',
  };

  return items.filter((item) => {
    const featureKey = featureMap[item.href];
    if (!featureKey) return true; // No feature flag = always shown
    return features[featureKey];
  });
}

/**
 * Validate white-label configuration for completeness.
 * @returns Array of validation issues (empty if valid)
 */
export function validateConfig(): string[] {
  const config = loadWhiteLabelConfig();
  const issues: string[] = [];

  if (!config.brand.app_name) issues.push('Missing app_name');
  if (!config.brand.app_display_name) issues.push('Missing app_display_name');
  if (!config.brand.primary_color.match(/^#[0-9a-fA-F]{6}$/)) issues.push('Invalid primary_color format');
  if (!config.brand.secondary_color.match(/^#[0-9a-fA-F]{6}$/)) issues.push('Invalid secondary_color format');
  if (!config.domains.app_domain) issues.push('Missing app_domain');
  if (!config.domains.api_domain) issues.push('Missing api_domain');
  if (config.locale.supported_locales.length === 0) issues.push('No supported locales');
  if (config.limits.max_family_members < 2) issues.push('max_family_members must be >= 2');
  if (config.limits.max_media_upload_mb < 1) issues.push('max_media_upload_mb must be >= 1');

  return issues;
}

/**
 * Reset cached configuration (for testing).
 */
export function resetConfig(): void {
  _config = null;
}
