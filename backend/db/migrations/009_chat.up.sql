-- 009: Chat conversations and messages

-- Conversations (direct and group)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  title TEXT, -- null for direct, required for group
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_family ON public.conversations(family_id);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC NULLS LAST);

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Conversation members
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_members_user ON public.conversation_members(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'system', 'shared_link')),
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  shared_content JSONB, -- for shared posts, events, recipes etc.
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_reply ON public.messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);

-- Read states
CREATE TABLE IF NOT EXISTS public.read_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Mentions
CREATE TABLE IF NOT EXISTS public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

CREATE INDEX idx_message_mentions_user ON public.message_mentions(mentioned_user_id);

-- Update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message() RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
