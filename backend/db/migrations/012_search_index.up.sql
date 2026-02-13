-- 012: Global search index with full-text search
-- Phase 7 — Continuity

-- Search index table — unified cross-domain search
CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'post', 'recipe', 'event', 'message', 'member', 'trip', 'photo'
  content_id UUID NOT NULL,
  title TEXT,
  body TEXT,
  author_id UUID REFERENCES users(id),
  visibility TEXT NOT NULL DEFAULT 'family',
  metadata JSONB NOT NULL DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id)
);

-- GIN index for full-text search
CREATE INDEX idx_search_vector ON search_index USING GIN(search_vector);
CREATE INDEX idx_search_family ON search_index(family_id);
CREATE INDEX idx_search_content_type ON search_index(content_type);
CREATE INDEX idx_search_author ON search_index(author_id);
CREATE INDEX idx_search_created ON search_index(created_at DESC);

-- Auto-generate search_vector on insert/update
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_search_vector_update
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Activity log for admin activity feed
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created_post', 'uploaded_photo', 'sent_message', etc.
  target_type TEXT NOT NULL, -- 'post', 'recipe', 'event', etc.
  target_id UUID NOT NULL,
  summary TEXT, -- human-readable summary
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_family ON activity_log(family_id);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- Auto-update updated_at for search_index
CREATE TRIGGER set_search_index_updated_at
  BEFORE UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
