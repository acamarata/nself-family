DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON public.messages;
DROP FUNCTION IF EXISTS update_conversation_last_message();
DROP TABLE IF EXISTS public.message_mentions;
DROP TABLE IF EXISTS public.read_states;
DROP TABLE IF EXISTS public.message_reactions;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversation_members;
DROP TABLE IF EXISTS public.conversations;
