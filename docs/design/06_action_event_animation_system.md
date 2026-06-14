# 06. 动作、事件与动画能力系统

## 1. 核心区别

```text
Action = 过程
Event  = 世界中发生过的事实
Animation = 前端表现
```

示例：钓鱼。

```text
Action: fish
ActionPhase: move_to_spot → sit_down → cast_line → wait_bite → reel_in
Event: fishing_started, fish_caught, fishing_failed
Animation: walk, sit, fish_cast, reel
Fallback: idle + fishing icon
```

## 2. 动作定义表

```sql
action_definitions
- id
- action_code
- name
- category                   -- movement / life / work / social / leisure / map_change
- description
- target_type                -- self / object / character / region / point
- preconditions_json
- effects_json
- required_tags_json
- fallback_mode              -- icon / generic / skip
- interruptible
- enabled
```

## 3. 动作阶段表

```sql
action_phases
- id
- action_code
- phase_order
- phase_code
- duration_ms
- required_animation_code
- fallback_animation_code
- fallback_icon
- can_interrupt
- event_on_start
- event_on_complete
- effects_json
```

## 4. 动作执行流程

```text
Command
→ ActionDefinition
→ Preconditions
→ Target Resolver
→ Interaction Point Resolver
→ Pathfinding
→ Phase Queue
→ Animation Presentation
→ Effects
→ Event Log
```

## 5. 第一批动作词典

### 基础动作

```text
move_to
wait
observe
turn_to
pickup_item
put_down_item
carry_item
```

### 姿态动作

```text
sit
stand_up
lie_down
sleep
rest
```

### 社交动作

```text
talk
listen
wave
nod
greet
argue_softly
```

### 生活动作

```text
drink
eat
fetch_water
wash_clothes
light_lamp
clean_home
```

### 家居/地图改造动作

```text
place_object
remove_object
repair_object
water_flower
plant_flower
```

### 农田动作

```text
hoe_soil
plant_seed
water_crop
remove_weeds
harvest_crop
carry_harvest
```

### 捕鱼动作

```text
fish
fish_cast
fish_wait
fish_reel
collect_fish
```

### 养马动作

```text
feed_horse
water_horse
brush_horse
clean_stall
lead_horse
hitch_cart
```

### 工作动作

```text
accept_work_task
start_work_task
complete_work_task
receive_wage
buy_item
sell_item
```

## 6. 钓鱼动作示例

```json
{
  "action_code": "fish",
  "name": "钓鱼",
  "category": "leisure",
  "target_type": "point",
  "required_tags": ["fishing_spot"],
  "preconditions": {
    "has_tool": "fishing_rod",
    "target_available": true
  },
  "fallback_mode": "icon"
}
```

阶段：

```json
[
  {
    "phase_order": 1,
    "phase_code": "approach_spot",
    "duration_ms": 0,
    "required_animation_code": "walk",
    "fallback_icon": "move"
  },
  {
    "phase_order": 2,
    "phase_code": "sit_down",
    "duration_ms": 1000,
    "required_animation_code": "sit",
    "fallback_icon": "sit"
  },
  {
    "phase_order": 3,
    "phase_code": "cast_line",
    "duration_ms": 1200,
    "required_animation_code": "fish_cast",
    "fallback_animation_code": "idle_sit",
    "fallback_icon": "fishing"
  },
  {
    "phase_order": 4,
    "phase_code": "wait_bite",
    "duration_ms": 6000,
    "required_animation_code": "idle_sit",
    "fallback_icon": "fishing"
  },
  {
    "phase_order": 5,
    "phase_code": "reel_in",
    "duration_ms": 1500,
    "required_animation_code": "fish_reel",
    "fallback_icon": "fish"
  }
]
```

## 7. 事件定义表

```sql
event_definitions
- id
- event_code
- name
- category                   -- life / work / economy / relationship / map / animal / system
- trigger_type               -- action_start / action_complete / timer / rule / llm
- visibility                 -- public / private / hidden / debug
- payload_schema_json
- importance
- memory_candidate
- enabled
```

## 8. 世界事件实例

```sql
world_events
- id
- world_id
- event_code
- actor_id
- target_character_id
- object_id
- region_id
- related_task_id
- related_transaction_id
- happened_at_tick
- happened_at_game_time
- payload_json
- visibility
- importance
- created_at
```

## 9. 第一批事件词典

### 地图/对象事件

```text
object_placed
object_removed
object_repaired
home_improved
flower_planted
crop_planted
crop_watered
crop_harvested
```

### 工作/经济事件

```text
job_started
job_quit
work_task_assigned
work_task_started
work_task_completed
wage_paid
item_purchased
item_sold
```

### 生活事件

```text
character_woke_up
character_slept
character_ate
character_drank
water_fetched
meal_cooked
```

### 社交事件

```text
conversation_started
conversation_message
relationship_changed
memory_created
```

### 动物事件

```text
horse_fed
horse_watered
horse_brushed
horse_resting
horse_sick
horse_trust_increased
```

## 10. 动画能力表

```sql
animation_capabilities
- id
- asset_pack_id
- model_type
- animation_code
- exists
- clip_name
- fallback_animation
- fallback_icon
- notes
```

示例：

```json
{
  "model_type": "villager_male_a",
  "animation_code": "fish_cast",
  "exists": false,
  "fallback_animation": "idle",
  "fallback_icon": "fishing"
}
```

## 11. 表现解析器

```ts
export interface ActionPresentationResolver {
  resolve(modelType: string, phase: ActionPhase): ActionPresentation;
}
```

输出：

```ts
export type ActionPresentation = {
  animationCode?: string;
  iconCode?: string;
  durationMs: number;
  mode: 'animation' | 'animation_with_icon' | 'icon_only';
};
```

## 12. 事件与记忆

不是所有事件都进入记忆。

进入记忆候选的事件：

```text
第一次完成某事
重要交易
关系变化
家发生变化
工作失败/成功
生病/照顾
对话中重要内容
```

不进入记忆的事件：

```text
普通移动
普通等待
重复浇水
重复喂马
```

## 13. 新增一个动作的流程

以 `wash_clothes` 为例：

```text
1. action_definitions 增加 wash_clothes
2. action_phases 配置 approach / wash / hang_dry
3. interaction_templates 中 washing_stone 支持 wash_clothes
4. event_definitions 增加 clothes_washed
5. animation_capabilities 配置 wash 动画或 fallback icon
6. content-validator 校验
7. 前端 icon_manifest 加 wash 图标
```

## 14. 禁止事项

```text
禁止每个动作都写 if/else 硬编码
禁止让动画名直接决定动作逻辑
禁止让事件只存在日志字符串里
禁止 LLM 直接制造事件
禁止动作失败时静默无记录
```
