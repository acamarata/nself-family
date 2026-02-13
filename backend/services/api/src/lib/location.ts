import type { Pool } from 'pg';

interface LocationUpdate {
  user_id: string;
  family_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  duration_hours?: number;
}

/**
 * Store a location update with automatic expiry.
 * @param pool - Database pool
 * @param input - Location data
 * @returns Created location share ID
 */
export async function updateLocation(pool: Pool, input: LocationUpdate): Promise<string> {
  const durationHours = input.duration_hours ?? 1;
  const { rows } = await pool.query(
    `INSERT INTO public.location_shares
      (user_id, family_id, latitude, longitude, accuracy, altitude, heading, speed, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now() + interval '1 hour' * $9)
     RETURNING id`,
    [input.user_id, input.family_id, input.latitude, input.longitude,
     input.accuracy ?? null, input.altitude ?? null, input.heading ?? null,
     input.speed ?? null, durationHours],
  );
  return rows[0].id;
}

/**
 * Get active location shares for family members.
 * Only returns non-expired locations.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns Array of active location shares
 */
export async function getActiveLocations(pool: Pool, familyId: string) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (ls.user_id) ls.*, u.display_name, u.avatar_url
     FROM public.location_shares ls
     JOIN public.users u ON u.id = ls.user_id
     WHERE ls.family_id = $1 AND ls.expires_at > now()
     ORDER BY ls.user_id, ls.created_at DESC`,
    [familyId],
  );
  return rows;
}

/**
 * Check if a location is inside a geofence.
 * Uses Haversine distance formula.
 * @param lat - Latitude
 * @param lng - Longitude
 * @param centerLat - Geofence center latitude
 * @param centerLng - Geofence center longitude
 * @param radiusMeters - Geofence radius in meters
 * @returns True if inside geofence
 */
export function isInsideGeofence(
  lat: number, lng: number,
  centerLat: number, centerLng: number,
  radiusMeters: number,
): boolean {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(centerLat - lat);
  const dLng = toRad(centerLng - lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(centerLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= radiusMeters;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Clean up expired location data.
 * @param pool - Database pool
 * @returns Number of deleted records
 */
export async function cleanupExpiredLocations(pool: Pool): Promise<number> {
  const { rowCount } = await pool.query(
    'DELETE FROM public.location_shares WHERE expires_at < now()',
  );
  return rowCount ?? 0;
}
