-- Reverse 012: Global search index

DROP TRIGGER IF EXISTS set_search_index_updated_at ON search_index;
DROP TRIGGER IF EXISTS trg_search_vector_update ON search_index;
DROP FUNCTION IF EXISTS update_search_vector();
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS search_index;
