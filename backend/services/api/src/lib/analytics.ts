import type { Pool } from 'pg';

interface TrackUsageInput {
  family_id: string;
  user_id?: string;
  metric_type: string;
  value: number;
  period_start: string;
  period_end: string;
}

interface QuotaLimitInput {
  family_id?: string;
  metric_type: string;
  soft_limit: number;
  hard_limit: number;
  alert_threshold_pct?: number;
}

interface QuotaCheckResult {
  metric_type: string;
  current_value: number;
  soft_limit: number;
  hard_limit: number;
  alert_threshold_pct: number;
  exceeded_soft: boolean;
  exceeded_hard: boolean;
  approaching_limit: boolean;
  usage_pct: number;
}

interface EntitlementInput {
  family_id: string;
  user_id: string;
  claim_type: string;
  claim_value: string;
  source?: string;
  expires_at?: string;
}

/**
 * Track a usage metric.
 * @param pool - Database pool
 * @param input - Usage data
 * @returns Metric record ID
 */
export async function trackUsage(pool: Pool, input: TrackUsageInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO usage_metrics (family_id, user_id, metric_type, value, period_start, period_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING RETURNING id`,
    [input.family_id, input.user_id ?? null, input.metric_type,
     input.value, input.period_start, input.period_end],
  );
  // If conflict (same period exists), update instead
  if (rows.length === 0) {
    const { rows: updated } = await pool.query(
      `UPDATE usage_metrics SET value = value + $1, updated_at = now()
       WHERE family_id = $2 AND metric_type = $3 AND period_start = $4
       RETURNING id`,
      [input.value, input.family_id, input.metric_type, input.period_start],
    );
    return updated[0]?.id ?? '';
  }
  return rows[0].id;
}

/**
 * Get usage metrics for a family.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param metricType - Optional metric type filter
 * @param limit - Max results
 * @returns Array of usage metrics
 */
export async function getUsageMetrics(pool: Pool, familyId: string, metricType?: string, limit = 100) {
  if (metricType) {
    const { rows } = await pool.query(
      `SELECT * FROM usage_metrics WHERE family_id = $1 AND metric_type = $2
       ORDER BY period_start DESC LIMIT $3`,
      [familyId, metricType, limit],
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT * FROM usage_metrics WHERE family_id = $1 ORDER BY period_start DESC LIMIT $2`,
    [familyId, limit],
  );
  return rows;
}

/**
 * Set a quota limit.
 * @param pool - Database pool
 * @param input - Quota configuration
 * @returns Quota limit ID
 */
export async function setQuotaLimit(pool: Pool, input: QuotaLimitInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO quota_limits (family_id, metric_type, soft_limit, hard_limit, alert_threshold_pct)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (family_id, metric_type) DO UPDATE SET
       soft_limit = $3, hard_limit = $4, alert_threshold_pct = $5, updated_at = now()
     RETURNING id`,
    [input.family_id ?? null, input.metric_type, input.soft_limit,
     input.hard_limit, input.alert_threshold_pct ?? 80],
  );
  return rows[0].id;
}

/**
 * Check quota for a family metric.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param metricType - Metric type to check
 * @returns Quota check result
 */
export async function checkQuota(pool: Pool, familyId: string, metricType: string): Promise<QuotaCheckResult> {
  // Get current usage (sum for current month)
  const { rows: [usage] } = await pool.query(
    `SELECT COALESCE(SUM(value), 0)::bigint AS current_value FROM usage_metrics
     WHERE family_id = $1 AND metric_type = $2
     AND period_start >= date_trunc('month', now())`,
    [familyId, metricType],
  );

  // Get limits (family-specific or global default)
  const { rows: [limit] } = await pool.query(
    `SELECT * FROM quota_limits
     WHERE metric_type = $1 AND (family_id = $2 OR family_id IS NULL)
     ORDER BY family_id NULLS LAST LIMIT 1`,
    [metricType, familyId],
  );

  const currentValue = Number(usage?.current_value ?? 0);
  const softLimit = Number(limit?.soft_limit ?? Infinity);
  const hardLimit = Number(limit?.hard_limit ?? Infinity);
  const thresholdPct = Number(limit?.alert_threshold_pct ?? 80);
  const usagePct = hardLimit > 0 ? Math.round((currentValue / hardLimit) * 100) : 0;

  return {
    metric_type: metricType,
    current_value: currentValue,
    soft_limit: softLimit,
    hard_limit: hardLimit,
    alert_threshold_pct: thresholdPct,
    exceeded_soft: currentValue >= softLimit,
    exceeded_hard: currentValue >= hardLimit,
    approaching_limit: usagePct >= thresholdPct,
    usage_pct: usagePct,
  };
}

/**
 * Get all quota statuses for a family.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns Array of quota check results
 */
export async function getAllQuotaStatuses(pool: Pool, familyId: string): Promise<QuotaCheckResult[]> {
  const { rows: limits } = await pool.query(
    `SELECT DISTINCT metric_type FROM quota_limits WHERE family_id = $1 OR family_id IS NULL`,
    [familyId],
  );
  const results: QuotaCheckResult[] = [];
  for (const { metric_type } of limits) {
    results.push(await checkQuota(pool, familyId, metric_type));
  }
  return results;
}

/**
 * Set an entitlement claim for a user.
 * @param pool - Database pool
 * @param input - Entitlement data
 * @returns Entitlement ID
 */
export async function setEntitlement(pool: Pool, input: EntitlementInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO entitlement_claims (family_id, user_id, claim_type, claim_value, source, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (family_id, user_id, claim_type) DO UPDATE SET
       claim_value = $4, source = $5, expires_at = $6, updated_at = now()
     RETURNING id`,
    [input.family_id, input.user_id, input.claim_type, input.claim_value,
     input.source ?? 'family_role', input.expires_at ?? null],
  );
  return rows[0].id;
}

/**
 * Get entitlement claims for a user.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param userId - User ID
 * @returns Array of entitlement claims
 */
export async function getEntitlements(pool: Pool, familyId: string, userId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM entitlement_claims
     WHERE family_id = $1 AND user_id = $2
     AND (expires_at IS NULL OR expires_at > now())`,
    [familyId, userId],
  );
  return rows;
}

/**
 * Map family role to TV entitlements.
 * @param role - Family role
 * @returns Array of default entitlement claims
 */
export function mapRoleToEntitlements(role: string): Array<{ claim_type: string; claim_value: string }> {
  const base = [
    { claim_type: 'can_watch', claim_value: 'true' },
  ];

  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return [...base,
        { claim_type: 'can_record', claim_value: 'true' },
        { claim_type: 'parental_level', claim_value: 'unrestricted' },
        { claim_type: 'max_streams', claim_value: '5' },
      ];
    case 'ADULT_MEMBER':
      return [...base,
        { claim_type: 'can_record', claim_value: 'true' },
        { claim_type: 'parental_level', claim_value: 'adult' },
        { claim_type: 'max_streams', claim_value: '3' },
      ];
    case 'YOUTH_MEMBER':
      return [...base,
        { claim_type: 'can_record', claim_value: 'false' },
        { claim_type: 'parental_level', claim_value: 'teen' },
        { claim_type: 'max_streams', claim_value: '2' },
      ];
    case 'CHILD_MEMBER':
      return [...base,
        { claim_type: 'can_record', claim_value: 'false' },
        { claim_type: 'parental_level', claim_value: 'child' },
        { claim_type: 'max_streams', claim_value: '1' },
      ];
    default:
      return base;
  }
}
