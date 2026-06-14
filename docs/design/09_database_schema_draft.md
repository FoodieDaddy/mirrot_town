# 09. 数据库表结构草案

> 本文件是第一阶段草案，字段可以根据实际 ORM/迁移工具调整。推荐 MySQL 起步，后续可迁移 PostgreSQL + pgvector 或接入 Qdrant。

## 1. World

```sql
CREATE TABLE worlds (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  game_time_json JSON NOT NULL,
  simulation_mode VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

```sql
CREATE TABLE world_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  snapshot_version BIGINT NOT NULL,
  snapshot_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_world_snapshot (world_id, snapshot_version)
);
```

## 2. Map

```sql
CREATE TABLE map_regions (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  region_code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  region_type VARCHAR(64) NOT NULL,
  polygon_json JSON NOT NULL,
  tags_json JSON,
  owner_type VARCHAR(32),
  owner_id VARCHAR(64),
  business_id VARCHAR(64),
  allowed_job_roles_json JSON,
  open_hours_json JSON,
  beauty_score INT DEFAULT 0,
  safety_score INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE placement_slots (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  region_id VARCHAR(64) NOT NULL,
  slot_code VARCHAR(64) NOT NULL,
  slot_type VARCHAR(64) NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  direction VARCHAR(16),
  allowed_tags_json JSON,
  occupied_by_object_id VARCHAR(64),
  owner_type VARCHAR(32),
  owner_id VARCHAR(64),
  access_level VARCHAR(32) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  INDEX idx_slot_region (world_id, region_id),
  INDEX idx_slot_type (world_id, slot_type)
);
```

## 3. Objects

```sql
CREATE TABLE object_templates (
  id VARCHAR(64) PRIMARY KEY,
  object_code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  size_w INT NOT NULL,
  size_h INT NOT NULL,
  height INT,
  collision_json JSON,
  capacity_json JSON,
  tags_json JSON,
  allowed_slot_types_json JSON,
  required_materials_json JSON,
  build_time_seconds INT DEFAULT 0,
  interaction_templates_json JSON,
  asset2d VARCHAR(255),
  asset3d VARCHAR(255),
  enabled BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE world_objects (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  template_id VARCHAR(64) NOT NULL,
  name VARCHAR(128),
  region_id VARCHAR(64),
  x INT NOT NULL,
  y INT NOT NULL,
  z INT DEFAULT 0,
  rotation FLOAT DEFAULT 0,
  state_json JSON,
  owner_type VARCHAR(32),
  owner_id VARCHAR(64),
  placed_by_character_id VARCHAR(64),
  current_durability INT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_world_objects_region (world_id, region_id),
  INDEX idx_world_objects_template (world_id, template_id)
);
```

```sql
CREATE TABLE interaction_points (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  object_id VARCHAR(64),
  region_id VARCHAR(64),
  point_code VARCHAR(64) NOT NULL,
  point_type VARCHAR(64) NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  direction VARCHAR(16),
  capacity INT DEFAULT 1,
  occupied_by_character_id VARCHAR(64),
  animation_hint VARCHAR(64),
  tags_json JSON,
  enabled BOOLEAN DEFAULT TRUE,
  INDEX idx_interaction_region (world_id, region_id),
  INDEX idx_interaction_object (world_id, object_id)
);
```

## 4. Characters

```sql
CREATE TABLE characters (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  gender VARCHAR(32),
  age INT,
  model_type VARCHAR(64),
  home_region_id VARCHAR(64),
  personality_json JSON,
  skills_json JSON,
  profile_json JSON,
  created_at DATETIME NOT NULL
);
```

```sql
CREATE TABLE character_states (
  character_id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  z INT DEFAULT 0,
  direction VARCHAR(16),
  current_action_code VARCHAR(64),
  current_region_id VARCHAR(64),
  need_json JSON,
  mood_json JSON,
  inventory_id VARCHAR(64),
  updated_at DATETIME NOT NULL
);
```

## 5. Actions / Events

```sql
CREATE TABLE action_definitions (
  id VARCHAR(64) PRIMARY KEY,
  action_code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  description TEXT,
  target_type VARCHAR(64),
  preconditions_json JSON,
  effects_json JSON,
  required_tags_json JSON,
  fallback_mode VARCHAR(32),
  interruptible BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE action_phases (
  id VARCHAR(64) PRIMARY KEY,
  action_code VARCHAR(64) NOT NULL,
  phase_order INT NOT NULL,
  phase_code VARCHAR(64) NOT NULL,
  duration_ms INT NOT NULL,
  required_animation_code VARCHAR(64),
  fallback_animation_code VARCHAR(64),
  fallback_icon VARCHAR(64),
  can_interrupt BOOLEAN DEFAULT TRUE,
  event_on_start VARCHAR(64),
  event_on_complete VARCHAR(64),
  effects_json JSON,
  INDEX idx_action_phase (action_code, phase_order)
);
```

```sql
CREATE TABLE event_definitions (
  id VARCHAR(64) PRIMARY KEY,
  event_code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  trigger_type VARCHAR(64),
  visibility VARCHAR(32) NOT NULL,
  payload_schema_json JSON,
  importance INT DEFAULT 0,
  memory_candidate BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE world_events (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  event_code VARCHAR(64) NOT NULL,
  actor_id VARCHAR(64),
  target_character_id VARCHAR(64),
  object_id VARCHAR(64),
  region_id VARCHAR(64),
  related_task_id VARCHAR(64),
  related_transaction_id VARCHAR(64),
  happened_at_tick BIGINT,
  happened_at_game_time JSON,
  payload_json JSON,
  visibility VARCHAR(32) NOT NULL,
  importance INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_world_events_time (world_id, created_at),
  INDEX idx_world_events_code (world_id, event_code)
);
```

## 6. Commands / Operations

```sql
CREATE TABLE agent_commands (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  character_id VARCHAR(64) NOT NULL,
  command_type VARCHAR(64) NOT NULL,
  payload_json JSON NOT NULL,
  status VARCHAR(32) NOT NULL,
  priority INT DEFAULT 0,
  source VARCHAR(32) NOT NULL,
  idempotency_key VARCHAR(128),
  created_at DATETIME NOT NULL,
  started_at DATETIME,
  completed_at DATETIME,
  failed_reason TEXT,
  INDEX idx_commands_status (world_id, status, priority)
);
```

```sql
CREATE TABLE agent_operations (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  character_id VARCHAR(64),
  operation_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  input_json JSON,
  output_json JSON,
  retry_count INT DEFAULT 0,
  next_run_at DATETIME,
  locked_by VARCHAR(64),
  locked_until DATETIME,
  error_message TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_operations_status (status, next_run_at)
);
```

## 7. Goals / Memory

```sql
CREATE TABLE agent_goals (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  character_id VARCHAR(64) NOT NULL,
  goal_type VARCHAR(64) NOT NULL,
  priority FLOAT NOT NULL,
  status VARCHAR(32) NOT NULL,
  target_region_id VARCHAR(64),
  target_object_id VARCHAR(64),
  reason TEXT,
  created_by VARCHAR(32),
  created_at DATETIME NOT NULL,
  deadline_at DATETIME
);
```

```sql
CREATE TABLE agent_tasks (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  goal_id VARCHAR(64),
  character_id VARCHAR(64) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  required_action_code VARCHAR(64),
  target_object_id VARCHAR(64),
  target_region_id VARCHAR(64),
  status VARCHAR(32) NOT NULL,
  order_index INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  completed_at DATETIME
);
```

```sql
CREATE TABLE memories (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  character_id VARCHAR(64) NOT NULL,
  memory_type VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  source_event_id VARCHAR(64),
  importance INT DEFAULT 0,
  emotional_valence FLOAT DEFAULT 0,
  related_character_ids_json JSON,
  related_object_ids_json JSON,
  related_region_ids_json JSON,
  tags_json JSON,
  embedding_id VARCHAR(64),
  created_at DATETIME NOT NULL,
  INDEX idx_memories_character (world_id, character_id, created_at)
);
```

```sql
CREATE TABLE relationships (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  from_character_id VARCHAR(64) NOT NULL,
  to_character_id VARCHAR(64) NOT NULL,
  trust INT DEFAULT 0,
  affection INT DEFAULT 0,
  respect INT DEFAULT 0,
  fear INT DEFAULT 0,
  conflict INT DEFAULT 0,
  familiarity INT DEFAULT 0,
  notes_json JSON,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_relationship (world_id, from_character_id, to_character_id)
);
```

## 8. Economy / Jobs

```sql
CREATE TABLE accounts (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  owner_type VARCHAR(32) NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  currency_code VARCHAR(32) NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_account_owner (world_id, owner_type, owner_id, currency_code)
);
```

```sql
CREATE TABLE money_transactions (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  from_account_id VARCHAR(64),
  to_account_id VARCHAR(64),
  amount INT NOT NULL,
  currency_code VARCHAR(32) NOT NULL,
  transaction_type VARCHAR(64) NOT NULL,
  reason TEXT,
  related_event_id VARCHAR(64),
  created_at DATETIME NOT NULL,
  INDEX idx_money_time (world_id, created_at)
);
```

```sql
CREATE TABLE businesses (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  business_type VARCHAR(64) NOT NULL,
  owner_character_id VARCHAR(64),
  region_id VARCHAR(64),
  account_id VARCHAR(64),
  inventory_id VARCHAR(64),
  status VARCHAR(32),
  created_at DATETIME NOT NULL
);
```

```sql
CREATE TABLE job_roles (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  role_code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  workplace_region_id VARCHAR(64),
  employer_type VARCHAR(32),
  employer_id VARCHAR(64),
  required_skills_json JSON,
  preferred_traits_json JSON,
  work_hours_json JSON,
  base_wage_per_day INT DEFAULT 0,
  wage_type VARCHAR(32),
  enabled BOOLEAN DEFAULT TRUE
);
```

```sql
CREATE TABLE character_jobs (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  character_id VARCHAR(64) NOT NULL,
  job_role_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  start_day INT,
  end_day INT,
  satisfaction INT DEFAULT 0,
  performance_score INT DEFAULT 0,
  wage_modifier FLOAT DEFAULT 1,
  created_at DATETIME NOT NULL
);
```

```sql
CREATE TABLE work_tasks (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  task_code VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  employer_account_id VARCHAR(64),
  assignee_character_id VARCHAR(64),
  workplace_region_id VARCHAR(64),
  target_object_id VARCHAR(64),
  required_action_code VARCHAR(64),
  status VARCHAR(32) NOT NULL,
  reward_amount INT DEFAULT 0,
  currency_code VARCHAR(32) DEFAULT 'coin',
  priority INT DEFAULT 0,
  deadline_at DATETIME,
  created_at DATETIME NOT NULL,
  completed_at DATETIME,
  INDEX idx_work_tasks_status (world_id, status, priority)
);
```

## 9. Animals / Farm

```sql
CREATE TABLE farm_plots (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  region_id VARCHAR(64) NOT NULL,
  slot_id VARCHAR(64),
  owner_type VARCHAR(32),
  owner_id VARCHAR(64),
  soil_quality INT DEFAULT 50,
  moisture INT DEFAULT 50,
  fertility INT DEFAULT 50,
  crop_object_id VARCHAR(64),
  state VARCHAR(32) NOT NULL,
  last_watered_at DATETIME,
  updated_at DATETIME NOT NULL
);
```

```sql
CREATE TABLE animals (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64) NOT NULL,
  species VARCHAR(64) NOT NULL,
  name VARCHAR(64),
  owner_type VARCHAR(32),
  owner_id VARCHAR(64),
  age INT,
  health INT DEFAULT 100,
  hunger INT DEFAULT 0,
  thirst INT DEFAULT 0,
  stamina INT DEFAULT 100,
  mood INT DEFAULT 50,
  trust_json JSON,
  current_region_id VARCHAR(64),
  current_object_id VARCHAR(64),
  state VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

## 10. Logs

```sql
CREATE TABLE llm_call_logs (
  id VARCHAR(64) PRIMARY KEY,
  world_id VARCHAR(64),
  character_id VARCHAR(64),
  operation_id VARCHAR(64),
  provider VARCHAR(64),
  model VARCHAR(128),
  task_type VARCHAR(64),
  prompt_tokens INT,
  completion_tokens INT,
  latency_ms INT,
  success BOOLEAN,
  error_message TEXT,
  created_at DATETIME NOT NULL
);
```
