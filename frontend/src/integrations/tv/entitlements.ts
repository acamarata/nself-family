/**
 * Entitlement claim mapper — translates family roles to TV-specific entitlements.
 */

export interface TVEntitlement {
  claim_type: string;
  claim_value: string;
}

/**
 * Map a family role to TV entitlements.
 * @param role - Family role (OWNER, ADMIN, ADULT_MEMBER, YOUTH_MEMBER, CHILD_MEMBER)
 * @returns Array of TV entitlement claims
 */
export function mapFamilyRoleToTVEntitlements(role: string): TVEntitlement[] {
  const base: TVEntitlement[] = [
    { claim_type: 'can_watch', claim_value: 'true' },
  ];

  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return [...base,
        { claim_type: 'can_record', claim_value: 'true' },
        { claim_type: 'parental_level', claim_value: 'unrestricted' },
        { claim_type: 'max_streams', claim_value: '5' },
        { claim_type: 'can_manage_devices', claim_value: 'true' },
      ];
    case 'ADULT_MEMBER':
      return [...base,
        { claim_type: 'can_record', claim_value: 'true' },
        { claim_type: 'parental_level', claim_value: 'adult' },
        { claim_type: 'max_streams', claim_value: '3' },
        { claim_type: 'can_manage_devices', claim_value: 'false' },
      ];
    case 'YOUTH_MEMBER':
      return [...base,
        { claim_type: 'can_record', claim_value: 'false' },
        { claim_type: 'parental_level', claim_value: 'teen' },
        { claim_type: 'max_streams', claim_value: '2' },
        { claim_type: 'can_manage_devices', claim_value: 'false' },
      ];
    case 'CHILD_MEMBER':
      return [...base,
        { claim_type: 'can_record', claim_value: 'false' },
        { claim_type: 'parental_level', claim_value: 'child' },
        { claim_type: 'max_streams', claim_value: '1' },
        { claim_type: 'can_manage_devices', claim_value: 'false' },
      ];
    default:
      return base;
  }
}

/**
 * Check if a user has a specific entitlement.
 * @param entitlements - Array of entitlement claims
 * @param claimType - Claim type to check
 * @param expectedValue - Expected value (default 'true')
 * @returns True if entitlement matches
 */
export function checkEntitlement(entitlements: TVEntitlement[], claimType: string, expectedValue = 'true'): boolean {
  return entitlements.some((e) => e.claim_type === claimType && e.claim_value === expectedValue);
}
