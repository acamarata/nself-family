DROP FUNCTION IF EXISTS cleanup_expired_locations();
DROP TABLE IF EXISTS public.geofences CASCADE;
DROP TABLE IF EXISTS public.location_shares CASCADE;
DROP TABLE IF EXISTS public.trip_itinerary_items CASCADE;
DROP TABLE IF EXISTS public.trip_participants CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.event_reminders CASCADE;
DROP TABLE IF EXISTS public.event_invites CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
