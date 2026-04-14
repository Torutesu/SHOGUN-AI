export const MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    sql: `
      -- Enable pgvector extension
      CREATE EXTENSION IF NOT EXISTS vector;

      -- Core pages table
      CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('person', 'company', 'session', 'concept')),
        title TEXT NOT NULL,
        compiled_truth TEXT NOT NULL DEFAULT '',
        timeline TEXT NOT NULL DEFAULT '',
        frontmatter JSONB NOT NULL DEFAULT '{}',
        content_hash TEXT NOT NULL DEFAULT '',
        search_vector TSVECTOR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Content chunks with embeddings
      CREATE TABLE IF NOT EXISTS content_chunks (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding vector(1536),
        chunk_source TEXT NOT NULL CHECK (chunk_source IN ('compiled_truth', 'timeline')),
        chunk_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Links between pages
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        from_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        to_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        link_type TEXT NOT NULL DEFAULT 'related',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(from_page_id, to_page_id, link_type)
      );

      -- Tags (many-to-many)
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(page_id, tag)
      );

      -- Structured timeline entries
      CREATE TABLE IF NOT EXISTS timeline_entries (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        entry_date TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Page version history
      CREATE TABLE IF NOT EXISTS page_versions (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        compiled_truth TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(page_id, version_number)
      );

      -- Raw data sidecar (external API data)
      CREATE TABLE IF NOT EXISTS raw_data (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Binary file attachments
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        data BYTEA,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Ingest audit log
      CREATE TABLE IF NOT EXISTS ingest_log (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        slug TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'skipped')),
        content_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Schema migrations tracker
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
      CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
      CREATE INDEX IF NOT EXISTS idx_pages_search_vector ON pages USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS idx_content_chunks_page_id ON content_chunks(page_id);
      CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_page_id);
      CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_page_id);
      CREATE INDEX IF NOT EXISTS idx_tags_page_id ON tags(page_id);
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
      CREATE INDEX IF NOT EXISTS idx_timeline_entries_page_id ON timeline_entries(page_id);
      CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON page_versions(page_id);
      CREATE INDEX IF NOT EXISTS idx_ingest_log_slug ON ingest_log(slug);

      -- Trigger to update search_vector on page changes
      CREATE OR REPLACE FUNCTION pages_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.compiled_truth, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.timeline, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS pages_search_vector_trigger ON pages;
      CREATE TRIGGER pages_search_vector_trigger
        BEFORE INSERT OR UPDATE ON pages
        FOR EACH ROW
        EXECUTE FUNCTION pages_search_vector_update();

      -- Trigger to update updated_at
      CREATE OR REPLACE FUNCTION pages_updated_at() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS pages_updated_at_trigger ON pages;
      CREATE TRIGGER pages_updated_at_trigger
        BEFORE UPDATE ON pages
        FOR EACH ROW
        EXECUTE FUNCTION pages_updated_at();
    `,
  },
  {
    version: 2,
    name: "hnsw_index_and_optimizations",
    sql: `
      -- HNSW index for fast vector similarity search
      -- Without this, vector search does linear scan (O(n))
      CREATE INDEX IF NOT EXISTS idx_content_chunks_embedding_hnsw
        ON content_chunks USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);

      -- Embedding cache for cost reduction
      CREATE TABLE IF NOT EXISTS embedding_cache (
        text_hash TEXT PRIMARY KEY,
        embedding vector(1536),
        model TEXT NOT NULL DEFAULT 'text-embedding-3-large',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(text_hash);

      -- Dream Cycle execution log
      CREATE TABLE IF NOT EXISTS dream_cycle_log (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        synced INTEGER NOT NULL DEFAULT 0,
        skipped INTEGER NOT NULL DEFAULT 0,
        entities_found INTEGER NOT NULL DEFAULT 0,
        links_fixed INTEGER NOT NULL DEFAULT 0,
        pages_merged INTEGER NOT NULL DEFAULT 0,
        health_report JSONB,
        status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
        error TEXT
      );

      -- Additional performance indexes
      CREATE INDEX IF NOT EXISTS idx_content_chunks_source ON content_chunks(chunk_source);
      CREATE INDEX IF NOT EXISTS idx_timeline_entries_date ON timeline_entries(entry_date);
      CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at);
      CREATE INDEX IF NOT EXISTS idx_pages_content_hash ON pages(content_hash);
    `,
  },
];
