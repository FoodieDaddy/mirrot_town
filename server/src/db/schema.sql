-- 镜中边城数据库 Schema
-- PostgreSQL + pgvector

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 记忆表
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id VARCHAR(64) NOT NULL,
  character_id VARCHAR(64) NOT NULL,
  memory_type VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  source_event_id UUID,
  importance FLOAT DEFAULT 0.5,
  emotional_valence FLOAT DEFAULT 0.0,
  related_character_ids JSONB DEFAULT '[]',
  related_object_ids JSONB DEFAULT '[]',
  related_region_ids JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  embedding VECTOR(1536),
  happened_at_tick INTEGER,
  happened_at_game_time JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  last_recalled_at TIMESTAMP,
  recall_count INTEGER DEFAULT 0
);

-- 关系表
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id VARCHAR(64) NOT NULL,
  from_character_id VARCHAR(64) NOT NULL,
  to_character_id VARCHAR(64) NOT NULL,
  trust FLOAT DEFAULT 0.5,
  affection FLOAT DEFAULT 0.5,
  respect FLOAT DEFAULT 0.5,
  conflict FLOAT DEFAULT 0.0,
  familiarity FLOAT DEFAULT 0.0,
  notes JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(world_id, from_character_id, to_character_id)
);

-- 日记表
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id VARCHAR(64) NOT NULL,
  character_id VARCHAR(64) NOT NULL,
  game_day INTEGER NOT NULL,
  content TEXT NOT NULL,
  source_event_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 村中日报表
CREATE TABLE IF NOT EXISTS village_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id VARCHAR(64) NOT NULL,
  time_range_start INTEGER NOT NULL,
  time_range_end INTEGER NOT NULL,
  content TEXT NOT NULL,
  important_event_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 向量索引
CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 关系索引
CREATE INDEX IF NOT EXISTS relationships_from_idx ON relationships (world_id, from_character_id);
CREATE INDEX IF NOT EXISTS relationships_to_idx ON relationships (world_id, to_character_id);

-- 日记索引
CREATE INDEX IF NOT EXISTS diary_character_day_idx ON diary_entries (world_id, character_id, game_day);
