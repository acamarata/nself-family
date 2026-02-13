-- 005: Visibility policies and audience controls
-- Adds explicit audience lists and policy evaluation

-- Per-post audience list (specific members who can see a post)
CREATE TABLE IF NOT EXISTS public.post_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_audiences_post ON public.post_audiences(post_id);
CREATE INDEX idx_post_audiences_user ON public.post_audiences(user_id);

-- Family policy settings
CREATE TABLE IF NOT EXISTS public.family_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE UNIQUE,
  islamic_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  default_visibility TEXT NOT NULL DEFAULT 'family' CHECK (default_visibility IN ('family', 'adults_only', 'private', 'public')),
  parental_controls_enabled BOOLEAN NOT NULL DEFAULT false,
  content_moderation_level TEXT NOT NULL DEFAULT 'standard' CHECK (content_moderation_level IN ('relaxed', 'standard', 'strict')),
  settings JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_family_settings_updated_at
  BEFORE UPDATE ON public.family_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Parental control rules per child
CREATE TABLE IF NOT EXISTS public.parental_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  can_view_adults_only BOOLEAN NOT NULL DEFAULT false,
  can_post BOOLEAN NOT NULL DEFAULT true,
  can_message BOOLEAN NOT NULL DEFAULT true,
  allowed_contacts UUID[] NOT NULL DEFAULT '{}',
  activity_monitoring BOOLEAN NOT NULL DEFAULT true,
  restrictions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, child_user_id)
);

CREATE TRIGGER set_parental_controls_updated_at
  BEFORE UPDATE ON public.parental_controls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
