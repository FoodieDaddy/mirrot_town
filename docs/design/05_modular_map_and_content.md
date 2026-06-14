# 05. 模块化地图与动态内容系统

## 1. 核心原则

地图不是一张固定背景图，而是：

```text
静态地形底板
+
动态世界对象
+
区域语义
+
交互点
+
放置槽位
+
规则系统
```

AI 可以改造小镇，但必须在规则允许的范围内。

## 2. 地图两层

### 静态地形层

由人工制作，保证美术质量和基础结构。

包括：

- 河流。
- 道路。
- 桥。
- 地形。
- 建筑外墙。
- 主要屋顶。
- 大型不可移动障碍。

### 动态对象层

由系统和 AI 改变。

包括：

- 床。
- 桌椅。
- 花盆。
- 作物。
- 马。
- 饲料槽。
- 水槽。
- 木桶。
- 工具架。
- 柴堆。
- 小型设施。

## 3. 推荐地图工具流

第一阶段建议：

```text
Tiled/LDtk 手工地图
→ 导出 JSON/TMJ
→ map-importer 转成 world_seed
→ 服务端加载静态地图 + 动态对象
```

AI 可以辅助生成氛围图和布局参考，但最终可运行地图应人工整理。

## 4. 地图图层建议

```text
Ground               地面
TerrainDetail        草、石、泥痕
Road                 土路/石板路
Water                河/池塘
Bridge               小桥
BuildingBase         建筑主体
Roof                 屋顶
DecorationBack       后景装饰
DynamicObjectsBack   动态对象后层
Characters           角色
DynamicObjectsFront  动态对象前层
CanopyOverlay        树冠/屋檐遮挡
Collision            碰撞层
Navigation           导航层
Interaction          交互点
Region               区域语义
PlacementSlot        放置槽位
```

## 5. 江南三国小村落第一版区域

### 住宅区

内容：

- 3-5 户人家。
- 小院。
- 水缸。
- 柴堆。
- 晾晒架。
- 可放床、箱子、花盆、草席。

支持事件：

- 回家。
- 睡觉。
- 布置家。
- 种花。
- 邻里拜访。

### 农田区

内容：

- 稻田/菜地。
- 灌溉沟。
- 田埂。
- 农具点。
- 草垛。

支持事件：

- 翻土。
- 播种。
- 浇水。
- 除草。
- 收割。
- 搬运粮食。

### 河边/渡口

内容：

- 河岸。
- 小桥。
- 洗衣点。
- 取水点。
- 钓鱼点。
- 渡口。

支持事件：

- 取水。
- 洗衣。
- 捕鱼。
- 钓鱼。
- 河边聊天。

### 马棚/畜养区

内容：

- 马厩。
- 马位。
- 饲料槽。
- 水槽。
- 刷马点。
- 围栏。
- 草料堆。

支持事件：

- 喂马。
- 饮马。
- 刷马。
- 清理马厩。
- 牵马。

### 工坊区

内容：

- 木工棚。
- 木料堆。
- 工作台。
- 工具架。
- 小仓库。

支持事件：

- 制木板。
- 做床。
- 做箱子。
- 修理工具。
- 修篱笆。

### 公共区

内容：

- 村口大树。
- 小亭。
- 告示木牌。
- 晒谷场。
- 小集市角。

支持事件：

- 聚集。
- 传闻。
- 发布工作。
- 交易。
- 村中日报。

## 6. 区域表

```sql
map_regions
- id
- world_id
- region_code
- name
- region_type              -- home / farm / riverbank / stable / workshop / square
- polygon_json
- tags_json                -- social, work, public, private, water, farm
- owner_type               -- character / household / business / town / none
- owner_id
- business_id
- allowed_job_roles_json
- open_hours_json
- beauty_score
- safety_score
- enabled
```

## 7. 世界对象模板

```sql
object_templates
- id
- object_code
- name
- category                 -- furniture / decor / crop / animal_facility / tool / building_part
- size_w
- size_h
- height
- collision_json
- capacity_json
- tags_json
- allowed_slot_types_json
- required_materials_json
- build_time_seconds
- interaction_templates_json
- asset2d
- asset3d
- enabled
```

## 8. 世界对象实例

```sql
world_objects
- id
- world_id
- template_id
- name
- region_id
- x
- y
- z
- rotation
- state_json
- owner_type
- owner_id
- placed_by_character_id
- current_durability
- enabled
- created_at
- updated_at
```

## 9. 放置槽位

放置槽位是让 AI 改地图但不乱来的关键。

```sql
placement_slots
- id
- world_id
- region_id
- slot_code
- slot_type                -- bed / decor / crop / animal / storage / workbench
- x
- y
- width
- height
- direction
- allowed_tags_json
- occupied_by_object_id
- owner_type
- owner_id
- access_level             -- private / household / public
- enabled
```

例子：

```text
home_001.slot_bed_01
home_001.slot_decor_01
farm_001.plot_01
stable_001.stall_01
```

## 10. 交互点

```sql
interaction_points
- id
- world_id
- object_id
- region_id
- point_code
- point_type               -- sit / use / fish / sleep / feed / water / talk / work
- x
- y
- direction
- capacity
- occupied_by_character_id
- animation_hint
- tags_json
- enabled
```

一个长椅可以有两个 sit 点。一个钓鱼点可以有 sit 点和 cast 方向。

## 11. AI 改造家的流程

以“加床”为例：

```text
NPC 发现睡眠质量低
→ 产生 improve_home_comfort 目标
→ 查询家里 bed 槽位
→ 查询 simple_bed 模板
→ 检查材料/钱/权限
→ 若材料不足，生成购买/工作/制作任务
→ 制作或购买床
→ place_object 到 slot_bed_01
→ world_objects 新增 simple_bed
→ home comfort 提升
→ 生成 object_placed 事件
→ 写入记忆
```

## 12. AI 种花流程

```text
NPC 性格喜欢整洁/美
→ 发现门口 decor/garden 槽位空闲
→ 有 flower_seed 或有钱购买
→ plant_flower
→ flower_pot / flower_crop 出现在门口
→ beauty_score 提升
→ 心情提升
```

## 13. 农田模块

```sql
farm_plots
- id
- world_id
- region_id
- slot_id
- owner_type
- owner_id
- soil_quality
- moisture
- fertility
- crop_object_id
- state                    -- empty / tilled / planted / growing / harvestable / dead
- last_watered_at
- updated_at
```

作物生命周期：

```text
empty → tilled → planted → sprout → growing → mature → harvestable → harvested/dead
```

## 14. 养马模块

马是 animal 实体，不是普通装饰。

```sql
animals
- id
- world_id
- species                  -- horse
- name
- owner_type
- owner_id
- age
- health
- hunger
- thirst
- stamina
- mood
- trust_json
- current_region_id
- current_object_id
- state                    -- idle / grazing / resting / working / sick
- created_at
- updated_at
```

马厩对象提供：

```text
stall_slot
feed_trough
water_trough
grooming_point
hay_storage
```

## 15. 第一批对象模板

住宅：

```text
simple_bed
wooden_box
low_table
wooden_stool
straw_mat
flower_pot
water_jar
```

农田：

```text
wheat_crop
carrot_crop
flower_crop
hay_stack
farm_tool_rack
```

河边：

```text
fishing_spot
washing_stone
water_fetch_point
small_pier
```

马棚：

```text
horse_stall
feed_trough
water_trough
hay_storage
grooming_post
```

工坊：

```text
wood_workbench
plank_stack
tool_rack
wood_storage
```

## 16. 禁止第一版开放的地图变更

```text
拆墙
改道路
挖河
扩建大建筑
自由放置任意坐标
建战斗墙体
```

第一版只允许在槽位里放置/更新/移除动态对象。
