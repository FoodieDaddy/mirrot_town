# 14. Vibecoding 任务板

本文件按可直接交给 vibercoding 的任务颗粒度拆分。建议每个任务都让它输出：改动文件、核心代码、测试方式、风险点。

## Sprint 0：项目骨架

### Task 0.1 建立 monorepo

目标：创建目录结构。

输出：

```text
shared/
client/
server/
worker/
content/
tools/
deploy/
docs/
```

验收：

```text
pnpm install 成功
server 和 client 可以分别启动空项目
```

### Task 0.2 建立 shared protocol

实现：

```text
WorldSnapshot
WorldDelta
ClientMessage
ServerMessage
Transform
WorldObject
CharacterViewState
```

验收：

```text
前后端都能引用 shared 类型
```

## Sprint 1：后端基础

### Task 1.1 Health API

接口：

```text
GET /api/health
```

返回 ok 和 serverTime。

### Task 1.2 WorldRuntime 内存版

实现：

```text
WorldRuntime
WorldClock
WorldState
```

先不用数据库，内存里生成 5 个 NPC。

### Task 1.3 Snapshot API

接口：

```text
GET /api/worlds/default/snapshot
```

返回当前角色和对象。

### Task 1.4 WebSocket ViewerHub

实现：

```text
/ws/worlds/default
viewer_join
world_status
world_delta
ping/pong
```

## Sprint 2：Cocos Web Demo

### Task 2.1 Cocos 空项目

要求：

```text
Cocos Creator 3.x
TypeScript
Web 构建能打开
```

### Task 2.2 PlatformAdapter

实现：

```text
PlatformAdapter interface
WebPlatformAdapter
NetworkPort
```

### Task 2.3 WorldStateStore

实现：

```text
applySnapshot
applyDelta
getCharacter
getObject
subscribe
```

### Task 2.4 渲染 5 个 NPC

使用假数据渲染 NPC sprite。

## Sprint 3：静态地图与动态对象

### Task 3.1 地图导入

从 Tiled/LDtk 导入地图。

输出：

```text
base map
regions
navgrid
```

### Task 3.2 object_templates 加载

读取 `content/objects/*.json`。

### Task 3.3 world_objects 渲染

前端根据 template asset 渲染对象。

### Task 3.4 object_added delta

后端发 object_added，前端新增渲染。

## Sprint 4：动作系统

### Task 4.1 action_definitions 加载

读取 `content/actions/*.json`。

### Task 4.2 ActionExecutor 基础动作

实现：

```text
move_to
wait
sit
fetch_water
```

### Task 4.3 头顶图标系统

实现：

```text
showStatusIcon(characterId, iconCode)
```

### Task 4.4 动画能力 fallback

实现：

```text
animation_capabilities
ActionPresentationResolver
```

## Sprint 5：地图改造

### Task 5.1 placement_slots

实现槽位数据结构与查询。

### Task 5.2 PlacementRuleEngine

检查：

```text
槽位类型
占用
碰撞
权限
材料
```

### Task 5.3 place_object 动作

实现放床、放花盆。

验收：

```text
NPC/系统能在家里放 simple_bed
能在门口放 flower_pot
```

## Sprint 6：种田、捕鱼、养马

### Task 6.1 farm_plots

实现地块状态与作物生命周期。

### Task 6.2 farming actions

实现：

```text
hoe_soil
plant_seed
water_crop
harvest_crop
```

### Task 6.3 fishing action

实现钓鱼动作链和 fallback 图标。

### Task 6.4 animals + horse care

实现：

```text
animals
feed_horse
water_horse
brush_horse
```

## Sprint 7：经济与岗位

### Task 7.1 accounts + money_transactions

实现账户和流水。

### Task 7.2 businesses + job_roles

实现经营主体和岗位。

### Task 7.3 work_tasks

实现工作任务生成与完成。

### Task 7.4 wage_paid

完成任务后支付工钱。

### Task 7.5 buy_item

NPC 可购买花种、干草、床等物品。

## Sprint 8：Agent 行为树

### Task 8.1 character_needs

实现 hunger/thirst/energy/social/comfort/money_pressure。

### Task 8.2 BehaviorTreeRunner

优先级：吃喝睡 → 工作 → 农田/马 → 目标 → 闲逛。

### Task 8.3 agent_goals / agent_tasks

实现目标和任务链。

### Task 8.4 生活目标示例

实现：

```text
睡不好 → 买/做床
喜欢装饰 → 种花
钱不够 → 找工作
马饿 → 喂马
```

## Sprint 9：LLM

### Task 9.1 LlmProvider

支持 OpenAI-compatible API。

### Task 9.2 AgentOperation 队列

实现 PENDING/RUNNING/SUCCEEDED/FAILED。

### Task 9.3 Intent 输出 schema

LLM 输出意图，不直接改世界。

### Task 9.4 对话 MVP

两个 NPC 或 NPC 与系统生成对话。

## Sprint 10：记忆与日报

### Task 10.1 memories 表和写入

重要事件进入记忆候选。

### Task 10.2 MemoryRetrievalService

Embedding + keyword fallback。

### Task 10.3 relationships

根据事件调整关系。

### Task 10.4 village_digests

生成玩家上线看到的小镇日报。

## Sprint 11：部署

### Task 11.1 docker-compose.dev.yml

包括 server、mysql、redis。

### Task 11.2 nginx 反代

静态资源、API、WS。

### Task 11.3 ECS 部署脚本

启动、停止、日志查看。

### Task 11.4 压测脚本

模拟 50/100 个 WebSocket viewer。

## Sprint 12：小游戏预研

### Task 12.1 WechatPlatformAdapter 空实现

不必完整上线，先让编译通过。

### Task 12.2 DouyinPlatformAdapter 空实现

不必完整上线，先让编译通过。

### Task 12.3 Cocos 微信构建验证

输出构建包。

### Task 12.4 Cocos 抖音构建验证

输出构建包。

## 给 vibercoding 的通用提示词模板

```text
你正在实现镜中边城，一个参考三国时期江南小村落的 AI 常驻沙盒模拟器。
请严格遵守：
1. 浏览者只是旁观者，不影响世界。
2. LLM 不能直接修改世界，只能输出意图。
3. 地图是静态底板 + 动态对象层。
4. 新动作、新事件、新对象尽量表驱动。
5. 正式前端 UI 不依赖 DOM。
6. core/shared 不允许依赖 Cocos、React、wx、tt。

请完成任务：<粘贴任务>
输出：
- 修改/新增文件列表
- 关键代码
- 如何测试
- 可能风险
```
