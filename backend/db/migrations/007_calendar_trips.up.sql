-- 007: Calendar events, trips, and location sharing

-- Calendar events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  recurrence_rule TEXT, -- iCal RRULE format
  color TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_family ON public.events(family_id);
CREATE INDEX idx_events_start ON public.events(start_at);

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Event invites / RSVPs
CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_invites_user ON public.event_invites(user_id);

-- Event reminders
CREATE TABLE IF NOT EXISTS public.event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'push')),
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_reminders_remind ON public.event_reminders(remind_at) WHERE NOT sent;

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_family ON public.trips(family_id);

CREATE TRIGGER set_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trip participants
CREATE TABLE IF NOT EXISTS public.trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Trip itinerary items
CREATE TABLE IF NOT EXISTS public.trip_itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  start_time TIME,
  end_time TIME,
  activity TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_itinerary_trip ON public.trip_itinerary_items(trip_id);

CREATE TRIGGER set_trip_itinerary_updated_at
  BEFORE UPDATE ON public.trip_itinerary_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Location shares (high-sensitivity — auto-delete enforced)
CREATE TABLE IF NOT EXISTS public.location_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy REAL,
  altitude REAL,
  heading REAL,
  speed REAL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_shares_user ON public.location_shares(user_id);
CREATE INDEX idx_location_shares_expires ON public.location_shares(expires_at);

-- Geofences
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_meters REAL NOT NULL,
  alert_on_enter BOOLEAN NOT NULL DEFAULT true,
  alert_on_exit BOOLEAN NOT NULL DEFAULT true,
  monitored_user_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-cleanup expired location data
CREATE OR REPLACE FUNCTION cleanup_expired_locations() RETURNS void AS $$
BEGIN
  DELETE FROM public.location_shares WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
