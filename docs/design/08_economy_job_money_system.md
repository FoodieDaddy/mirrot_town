# 08. 金钱、工作与岗位系统

## 1. 核心目标

金钱和岗位不是 UI 数字，而是 NPC 的长期动机来源。

```text
想买床 → 钱不够 → 找工作 → 完成任务 → 得工钱 → 买材料/家具 → 改善生活
```

## 2. 第一版经济边界

第一版做：

```text
钱包
账户
工钱
岗位
工作任务
物品价格
购买/出售
简单店铺/雇主
金钱流水
```

第一版不做：

```text
银行
贷款
税收
通货膨胀
复杂市场竞价
股票
大规模供需系统
```

## 3. 账户系统

```sql
accounts
- id
- world_id
- owner_type              -- character / household / business / town
- owner_id
- currency_code           -- coin
- balance
- created_at
- updated_at
```

外显名可用：

```text
钱
铜钱
钱串
```

内部统一用 `coin`。

## 4. 金钱流水

```sql
money_transactions
- id
- world_id
- from_account_id
- to_account_id
- amount
- currency_code
- transaction_type        -- wage / purchase / sale / gift / reward / rent / refund
- reason
- related_event_id
- created_at
```

所有钱的变化必须写流水。

## 5. 物品价格

```sql
item_price_definitions
- id
- item_code
- base_price
- currency_code
- category
- can_buy
- can_sell
- price_tags_json
- enabled
```

第一批价格建议：

| item_code | base_price | 说明 |
|---|---:|---|
| wheat_seed | 2 | 小麦种子 |
| carrot_seed | 3 | 菜种 |
| flower_seed | 2 | 花种 |
| hay | 1 | 干草 |
| wood_plank | 4 | 木板 |
| cloth | 5 | 布 |
| simple_bed | 25 | 简易木床 |
| fishing_rod | 18 | 钓竿 |
| wooden_box | 12 | 木箱 |

## 6. 店铺/经营主体

```sql
businesses
- id
- world_id
- name
- business_type           -- farm / tavern / workshop / stable / market
- owner_character_id
- region_id
- account_id
- inventory_id
- status
- created_at
```

第一批：

```text
春田农圃
河边渔铺
木工棚
南口马棚
小食肆/公共灶
村公账
```

## 7. 岗位系统

岗位是长期身份，不是具体动作。

```sql
job_roles
- id
- world_id
- role_code
- name
- workplace_region_id
- employer_type           -- business / household / town / self_employed
- employer_id
- required_skills_json
- preferred_traits_json
- work_hours_json
- base_wage_per_day
- wage_type               -- daily / per_task / hourly
- enabled
```

## 8. NPC 任职关系

```sql
character_jobs
- id
- world_id
- character_id
- job_role_id
- status                  -- active / quit / fired / paused / applicant
- start_day
- end_day
- satisfaction
- performance_score
- wage_modifier
- created_at
```

第一版：每个 NPC 最多一个主职，可以接临时任务。

## 9. 第一批岗位

### 农夫 farmer

地点：农田。

任务：

```text
翻土
播种
浇水
除草
收割
搬到仓库
```

### 马夫 stable_hand

地点：马棚。

任务：

```text
喂马
加水
刷马
清理马厩
牵马
检查马状态
```

### 木工 carpenter

地点：工坊。

任务：

```text
制木板
做床
做箱子
修篱笆
做农具
```

### 渔夫 fisher

地点：河边/渡口。

任务：

```text
钓鱼
整理鱼
卖鱼
补网
```

### 食肆帮工 tavern_worker

地点：小食肆/公共灶。

任务：

```text
做饭
端饭
收拾桌子
打扫
招呼客人
```

### 搬运工 carrier

地点：全村。

任务：

```text
搬木头
搬粮
送水
送草料
店铺送货
```

## 10. 工作任务

```sql
work_tasks
- id
- world_id
- task_code
- title
- employer_account_id
- assignee_character_id
- workplace_region_id
- target_object_id
- required_action_code
- status                  -- open / assigned / in_progress / completed / failed / cancelled
- reward_amount
- currency_code
- priority
- deadline_at
- created_at
- completed_at
```

## 11. 任务模板

```sql
job_task_templates
- id
- job_role_code
- task_code
- title_template
- required_action_code
- target_selector_json
- frequency               -- daily / hourly / when_needed / seasonal
- reward_amount
- conditions_json
- priority
- enabled
```

例子：马夫喂马。

```json
{
  "job_role_code": "stable_hand",
  "task_code": "feed_horse",
  "required_action_code": "feed_horse",
  "target_selector": {
    "type": "animal",
    "species": "horse",
    "condition": "hunger > 40"
  },
  "frequency": "when_needed",
  "reward_amount": 3
}
```

## 12. AI 如何选择工作

工作评分：

```text
job_score =
  money_need * 0.30
+ skill_match * 0.25
+ personality_match * 0.15
+ relationship_with_employer * 0.10
+ distance_score * 0.10
+ wage_score * 0.10
```

例子：

```text
喜欢动物 → 更可能做马夫
喜欢植物 → 更可能做农夫
手工技能高 → 更可能做木工
外向 → 更可能去食肆帮工
```

## 13. 工作与动作链

### 喂马任务

```text
work_task: feed_horse
→ move_to_hay_storage
→ take_item(hay)
→ move_to_feed_trough
→ fill_feed_trough
→ horse_fed event
→ wage_paid transaction
```

### 种田任务

```text
work_task: plant_wheat
→ take_item(wheat_seed)
→ move_to_farm_plot
→ hoe_soil
→ plant_seed
→ crop_planted event
→ wage_paid transaction
```

### 做床任务

```text
work_task: craft_simple_bed
→ take wood_plank + cloth
→ move_to_workbench
→ craft_object(simple_bed)
→ object_created event
→ wage_paid transaction
```

## 14. NPC 消费动机

消费类型：

```text
生存消费：食物、水、药
工具消费：锄、鱼竿、斧
家庭消费：床、箱子、桌子
装饰消费：花、画、地毯
社交消费：请客、送礼
动物消费：草料、刷子、马具
```

消费由目标触发：

```text
睡不好 → 买床
想种花 → 买花种子
养马 → 买干草
想钓鱼赚钱 → 买钓竿
```

## 15. 金钱事件

```text
wage_paid
item_purchased
item_sold
money_given
work_task_completed
job_started
job_quit
```

这些事件会影响记忆和关系。

## 16. 防作弊原则

LLM 不能直接改钱。

允许 LLM 输出：

```text
我想找工作
我想买花种子
我想卖鱼
```

不允许：

```text
我获得 100 钱
```

钱的变化只能由交易、工资、奖励等系统规则产生。
