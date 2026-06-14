# 07. AI Agent、目标、计划与记忆系统

## 1. 核心原则

AI 不是每一秒都问 LLM “下一步做什么”。

第一阶段采用：

```text
行为树负责日常
目标系统负责长期动机
LLM 负责开放性选择与语言
规则引擎负责落地执行
```

## 2. Agent 决策层级

```text
Need System
    ↓
Goal System
    ↓
Behavior Tree
    ↓
LLM Intent
    ↓
Planner / IntentTranslator
    ↓
Command
    ↓
ActionExecutor
```

## 3. 基础需求

```sql
character_needs
- character_id
- hunger
- thirst
- energy
- cleanliness
- social
- comfort
- money_pressure
- safety
- updated_at
```

需求影响行为：

```text
hunger 高 → 找食物/买食物/做饭
thirst 高 → 去井边取水/喝水
energy 低 → 回家睡觉
comfort 低 → 想改善家
money_pressure 高 → 找工作
social 低 → 去公共区聊天
```

## 4. 目标系统

```sql
agent_goals
- id
- world_id
- character_id
- goal_type                 -- improve_home / earn_money / grow_food / care_horse / socialize
- priority
- status                    -- active / paused / completed / failed / abandoned
- target_region_id
- target_object_id
- reason
- created_by                -- behavior_tree / llm / system
- created_at
- deadline_at
```

目标例子：

```text
improve_home_comfort
buy_bed
grow_food
care_horse
earn_money
plant_flowers
make_friend
```

## 5. 任务系统

```sql
agent_tasks
- id
- world_id
- goal_id
- character_id
- task_type
- required_action_code
- target_object_id
- target_region_id
- status                    -- pending / running / completed / failed / skipped
- order_index
- created_at
- completed_at
```

示例目标：做床。

```text
goal: improve_home_comfort
1. check_bed_slot
2. check_materials
3. earn_money_if_needed
4. buy_or_craft_bed
5. carry_bed_home
6. place_object
7. sleep
```

## 6. 行为树

第一版行为树优先级：

```text
1. 安全/异常处理
2. 生理需求：吃喝睡
3. 工作时间：岗位任务
4. 动物/农田紧急任务
5. 当前目标任务
6. 社交/休闲
7. 闲逛/观察
```

伪代码：

```ts
if (need.energy > 80) return goSleep();
if (need.hunger > 70) return findFood();
if (hasActiveWorkTask()) return doWorkTask();
if (farmNeedsWater()) return waterCrop();
if (horseHungry()) return feedHorse();
if (hasGoalTask()) return doGoalTask();
if (socialNeedHigh()) return goTalk();
return wanderNearHomeOrSquare();
```

## 7. LLM 使用场景

第一阶段 LLM 用于：

```text
自然语言对话
开放式目标选择
家居/装饰偏好
关系判断
事件反思
日记/小镇日报摘要
突发事件决策
```

不用于：

```text
每次移动
每次浇水
每次喂马
每次工作任务执行
每次购买固定物品
```

## 8. AgentOperation

```sql
agent_operations
- id
- world_id
- character_id
- operation_type            -- THINK / REPLY / REFLECT / SUMMARIZE / DIARY
- status                    -- PENDING / RUNNING / SUCCEEDED / FAILED / RETRYING / CANCELLED
- input_json
- output_json
- retry_count
- next_run_at
- locked_by
- locked_until
- error_message
- created_at
- updated_at
```

所有 LLM 调用必须走 AgentOperation。

## 9. LLM 输出结构

LLM 不输出“直接改世界”的指令，只输出意图。

```json
{
  "intent_type": "improve_home",
  "priority": 0.7,
  "target_preference": {
    "object_tags": ["bed", "comfort"],
    "region_tags": ["home", "private"]
  },
  "reason": "最近夜里总睡不好，想让家里更安稳。"
}
```

IntentTranslator 再把意图转成 Goal/Task/Command。

## 10. 感知系统

Perception 输入：

```text
当前角色状态
附近角色
附近对象
当前区域
当前时间
天气/季节
未完成目标
工作任务
近期事件
相关记忆
关系状态
```

注意空间查询要通过 SpatialIndex，不能遍历全世界对象。

## 11. 记忆系统分层

```text
Event = 世界事实
Memory = 某个角色主观记住的内容
Reflection = 对多个记忆的总结
Relationship = 对其他人的长期看法
Diary = 每日叙事输出
```

## 12. 记忆表

```sql
memories
- id
- world_id
- character_id
- memory_type              -- event / dialogue / reflection / relationship / goal
- content
- source_event_id
- importance
- emotional_valence
- related_character_ids_json
- related_object_ids_json
- related_region_ids_json
- tags_json
- embedding_id
- created_at
```

## 13. 记忆检索

流程：

```text
提取当前人物/地点/对象/任务关键词
→ embedding 检索
→ 关键词 fallback
→ importance/recency/relationship 加权
→ Top 5-8 注入 Prompt
```

评分：

```text
score = semantic * 0.55 + importance * 0.25 + recency * 0.10 + emotion * 0.10
```

## 14. 关系系统

```sql
relationships
- id
- world_id
- from_character_id
- to_character_id
- trust
- affection
- respect
- fear
- conflict
- familiarity
- notes_json
- updated_at
```

关系由事件慢慢改变。

例如：

```text
按时发工资 → trust +1
帮忙喂马 → affection +1
拖欠工资 → conflict +2
吵架 → affection -2
```

## 15. 日记与村中日报

NPC 日记：个人视角。

小镇日报：玩家上线看到的摘要。

```sql
diary_entries
- id
- world_id
- character_id
- game_day
- content
- source_event_ids_json
- created_at
```

```sql
village_digests
- id
- world_id
- time_range_start
- time_range_end
- content
- important_event_ids_json
- created_at
```

## 16. 第一阶段 AI 实现顺序

```text
1. 先做 BehaviorTree，无 LLM 跑通生活
2. 加 AgentGoal/AgentTask
3. 加 AgentOperation 队列
4. 接 LLM 做对话
5. 接 LLM 做开放目标选择
6. 加记忆写入
7. 加记忆检索
8. 加关系变化
9. 加日记/村中日报
```
