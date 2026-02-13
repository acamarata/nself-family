-- 010: Notification system

-- Notification events
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'chat_message', 'mention', 'rsvp_reminder', 'location_alert', 'admin_action', 'birthday', 'event_reminder', 'post_mention'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'push', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  source_id UUID, -- ID of the source entity (message_id, event_id, etc.)
  source_type TEXT, -- 'message', 'event', 'post', 'location', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_events_user ON public.notification_events(user_id, created_at DESC);
CREATE INDEX idx_notification_events_status ON public.notification_events(status) WHERE status = 'pending';
CREATE INDEX idx_notification_events_dedup ON public.notification_events(user_id, source_id, source_type, type);

-- Push notification tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('fcm', 'apns', 'web')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE TRIGGER set_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'chat_message', 'mention', 'event_reminder', etc.
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'push', 'email')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME,   -- e.g., '07:00'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type, channel)
);

CREATE TRIGGER set_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Conversation notification overrides
CREATE TABLE IF NOT EXISTS public.conversation_notification_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'all' CHECK (level IN ('all', 'mentions_only', 'muted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TRIGGER set_conv_notif_overrides_updated_at
  BEFORE UPDATE ON public.conversation_notification_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
