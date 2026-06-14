/**
 * PgMemoryService — PostgreSQL-backed memory service with vector search.
 *
 * Persistent implementation of MemoryService using PostgreSQL + pgvector.
 * Supports vector similarity search for semantic memory retrieval.
 */

import { randomUUID } from 'node:crypto';
import { getPool } from '../db/connection.js';
import type { Memory, MemoryType } from './types.js';

export interface PgMemoryServiceOptions {
  embeddingDimension?: number;
  maxMemoriesPerCharacter?: number;
}

export class PgMemoryService {
  private readonly embeddingDimension: number;
  private readonly maxMemories: number;

  constructor(options: PgMemoryServiceOptions = {}) {
    this.embeddingDimension = options.embeddingDimension ?? 1536;
    this.maxMemories = options.maxMemoriesPerCharacter ?? 100;
  }

  /**
   * Create a new memory.
   */
  async createMemory(params: {
    characterId: string;
    memoryType: MemoryType;
    content: string;
    importance: number;
    emotionalValence: number;
    relatedEventId?: string;
    relatedCharacterId?: string;
    relatedObjectId?: string;
    happenedAtTick: number;
    gameTime: { day: number; hour: number; minute: number };
    embedding?: number[];
  }): Promise<Memory> {
    const pool = getPool();
    const id = randomUUID();

    const embeddingParam = params.embedding
      ? `[${params.embedding.join(',')}]`
      : null;

    await pool.query(
      `INSERT INTO memories (
        id, character_id, memory_type, content,
        importance, emotional_valence,
        related_event_id, related_character_id, related_object_id,
        embedding, happened_at_tick, happened_at_game_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        params.characterId,
        params.memoryType,
        params.content,
        Math.max(1, Math.min(10, params.importance)),
        Math.max(-1, Math.min(1, params.emotionalValence)),
        params.relatedEventId ?? null,
        params.relatedCharacterId ?? null,
        params.relatedObjectId ?? null,
        embeddingParam,
        params.happenedAtTick,
        JSON.stringify(params.gameTime),
      ]
    );

    return {
      id,
      characterId: params.characterId,
      memoryType: params.memoryType,
      content: params.content,
      importance: Math.max(1, Math.min(10, params.importance)),
      emotionalValence: Math.max(-1, Math.min(1, params.emotionalValence)),
      relatedEventId: params.relatedEventId,
      relatedCharacterId: params.relatedCharacterId,
      relatedObjectId: params.relatedObjectId,
      happenedAtTick: params.happenedAtTick,
      happenedAtGameTime: params.gameTime,
      createdAt: Date.now(),
      recallCount: 0,
    };
  }

  /**
   * Get memories for a character, ordered by importance.
   */
  async getMemories(characterId: string, limit?: number): Promise<Memory[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM memories
       WHERE character_id = $1
       ORDER BY importance DESC
       LIMIT $2`,
      [characterId, limit ?? this.maxMemories]
    );

    return result.rows.map(this.rowToMemory);
  }

  /**
   * Get memories related to a specific character.
   */
  async getMemoriesAboutCharacter(
    characterId: string,
    aboutCharacterId: string
  ): Promise<Memory[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM memories
       WHERE character_id = $1 AND related_character_id = $2
       ORDER BY importance DESC`,
      [characterId, aboutCharacterId]
    );

    return result.rows.map(this.rowToMemory);
  }

  /**
   * Get memories related to a specific object.
   */
  async getMemoriesAboutObject(
    characterId: string,
    objectId: string
  ): Promise<Memory[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM memories
       WHERE character_id = $1 AND related_object_id = $2
       ORDER BY importance DESC`,
      [characterId, objectId]
    );

    return result.rows.map(this.rowToMemory);
  }

  /**
   * Search memories by vector similarity.
   */
  async searchMemories(
    characterId: string,
    queryEmbedding: number[],
    limit: number = 5
  ): Promise<Memory[]> {
    const pool = getPool();
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const result = await pool.query(
      `SELECT *, 1 - (embedding <=> $2) as similarity
       FROM memories
       WHERE character_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <=> $2
       LIMIT $3`,
      [characterId, embeddingStr, limit]
    );

    return result.rows.map(this.rowToMemory);
  }

  /**
   * Get recent memories.
   */
  async getRecentMemories(
    characterId: string,
    limit: number = 10
  ): Promise<Memory[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM memories
       WHERE character_id = $1
       ORDER BY happened_at_tick DESC
       LIMIT $2`,
      [characterId, limit]
    );

    return result.rows.map(this.rowToMemory);
  }

  /**
   * Get emotionally significant memories (high absolute valence).
   */
  async getEmotionalMemories(
    characterId: string,
    limit: number = 5
  ): Promise<Memory[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM memories
       WHERE character_id = $1
       ORDER BY ABS(emotional_valence) DESC
       LIMIT $2`,
      [characterId, limit]
    );

    return result.rows.map(this.rowToMemory);
  }

  /**
   * Update recall count for a memory.
   */
  async recallMemory(memoryId: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE memories
       SET recall_count = recall_count + 1, last_recalled_at = NOW()
       WHERE id = $1`,
      [memoryId]
    );
  }

  /**
   * Get memory count for a character.
   */
  async getMemoryCount(characterId: string): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM memories WHERE character_id = $1',
      [characterId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Apply forgetting — remove low importance old memories.
   */
  async applyForgetting(): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM memories
       WHERE importance < 2
       AND last_recalled_at IS NULL
       AND created_at < NOW() - INTERVAL '7 days'`
    );
    return result.rowCount ?? 0;
  }

  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      characterId: row.character_id,
      memoryType: row.memory_type,
      content: row.content,
      importance: parseFloat(row.importance),
      emotionalValence: parseFloat(row.emotional_valence),
      relatedEventId: row.related_event_id ?? undefined,
      relatedCharacterId: row.related_character_id ?? undefined,
      relatedObjectId: row.related_object_id ?? undefined,
      happenedAtTick: row.happened_at_tick,
      happenedAtGameTime:
        typeof row.happened_at_game_time === 'string'
          ? JSON.parse(row.happened_at_game_time)
          : row.happened_at_game_time,
      createdAt: new Date(row.created_at).getTime(),
      lastRecalledAt: row.last_recalled_at
        ? new Date(row.last_recalled_at).getTime()
        : undefined,
      recallCount: row.recall_count,
    };
  }
}
