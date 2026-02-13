import type { Pool } from 'pg';

interface CreateEventInput {
  family_id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  location?: string;
  recurrence_rule?: string;
  color?: string;
  created_by: string;
}

/**
 * Create a calendar event.
 * @param pool - Database pool
 * @param input - Event data
 * @returns Created event ID
 */
export async function createEvent(pool: Pool, input: CreateEventInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO public.events (family_id, title, description, start_at, end_at, all_day, location, recurrence_rule, color, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [input.family_id, input.title, input.description ?? null, input.start_at, input.end_at ?? null,
     input.all_day ?? false, input.location ?? null, input.recurrence_rule ?? null,
     input.color ?? null, input.created_by],
  );
  return rows[0].id;
}

/**
 * Respond to an event invitation.
 * @param pool - Database pool
 * @param eventId - Event ID
 * @param userId - User responding
 * @param status - RSVP status
 */
export async function respondToInvite(
  pool: Pool,
  eventId: string,
  userId: string,
  status: 'accepted' | 'declined' | 'maybe',
): Promise<void> {
  await pool.query(
    `INSERT INTO public.event_invites (event_id, user_id, status, responded_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (event_id, user_id)
     DO UPDATE SET status = $3, responded_at = now()`,
    [eventId, userId, status],
  );
}

/**
 * Generate iCal feed for a family's events.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @returns iCal formatted string
 */
export async function generateICalFeed(pool: Pool, familyId: string): Promise<string> {
  const { rows: events } = await pool.query(
    `SELECT id, title, description, start_at, end_at, all_day, location, recurrence_rule
     FROM public.events
     WHERE family_id = $1 AND is_deleted = false
     ORDER BY start_at`,
    [familyId],
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//nSelf//nFamily//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@nfamily.nself.org`);
    lines.push(`SUMMARY:${escapeICalText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeICalText(event.location)}`);

    if (event.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${formatICalDate(event.start_at)}`);
      if (event.end_at) lines.push(`DTEND;VALUE=DATE:${formatICalDate(event.end_at)}`);
    } else {
      lines.push(`DTSTART:${formatICalDateTime(event.start_at)}`);
      if (event.end_at) lines.push(`DTEND:${formatICalDateTime(event.end_at)}`);
    }

    if (event.recurrence_rule) lines.push(`RRULE:${event.recurrence_rule}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatICalDate(date: string): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function formatICalDateTime(date: string): string {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
