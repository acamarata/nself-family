-- 006: Genealogy extensions for family tree
-- Adds biographical data, generation tracking, and GEDCOM support

-- Genealogy profiles (extended biographical data beyond user profiles)
CREATE TABLE IF NOT EXISTS public.genealogy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- Biographical data
  full_name TEXT NOT NULL,
  maiden_name TEXT,
  birth_date DATE,
  birth_place TEXT,
  death_date DATE,
  death_place TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  -- Generation tracking
  generation_number INT,
  -- GEDCOM compatibility
  gedcom_id TEXT,
  -- Additional data
  biography TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_genealogy_profiles_family ON public.genealogy_profiles(family_id);
CREATE INDEX idx_genealogy_profiles_user ON public.genealogy_profiles(user_id);
CREATE INDEX idx_genealogy_profiles_gedcom ON public.genealogy_profiles(gedcom_id) WHERE gedcom_id IS NOT NULL;

CREATE TRIGGER set_genealogy_profiles_updated_at
  BEFORE UPDATE ON public.genealogy_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Albums
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  cover_media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'family' CHECK (visibility IN ('family', 'adults_only', 'private', 'public')),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_albums_family ON public.albums(family_id);

CREATE TRIGGER set_albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Album items (media in albums)
CREATE TABLE IF NOT EXISTS public.album_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(album_id, media_item_id)
);

CREATE INDEX idx_album_items_album ON public.album_items(album_id);

-- Media tags (people, places, events tagged in media)
CREATE TABLE IF NOT EXISTS public.media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('person', 'place', 'event', 'custom')),
  tagged_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tag_value TEXT,
  position_x REAL,
  position_y REAL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_tags_media ON public.media_tags(media_item_id);
CREATE INDEX idx_media_tags_user ON public.media_tags(tagged_user_id) WHERE tagged_user_id IS NOT NULL;

-- Media comments
CREATE TABLE IF NOT EXISTS public.media_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id),
  body TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_comments_media ON public.media_comments(media_item_id);

CREATE TRIGGER set_media_comments_updated_at
  BEFORE UPDATE ON public.media_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Media favorites
CREATE TABLE IF NOT EXISTS public.media_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_item_id, user_id)
);
