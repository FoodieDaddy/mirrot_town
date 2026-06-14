# 01. 推荐仓库目录结构

本项目建议使用 monorepo。前端、后端、共享协议、内容配置、地图工具、部署脚本都放在同一个仓库中，方便 vibercoding 统一理解上下文。

## 1. 总目录

```text
jingzhong-biancheng/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── docs/
│   ├── design/
│   ├── api/
│   ├── database/
│   └── art/
│
├── shared/
│   ├── protocol/
│   ├── schemas/
│   ├── constants/
│   ├── actions/
│   ├── events/
│   ├── objects/
│   └── map/
│
├── client/
│   ├── core/
│   ├── cocos/
│   ├── web-shell/
│   └── tools/
│
├── server/
│   ├── src/
│   ├── migrations/
│   ├── seeds/
│   └── tests/
│
├── worker/
│   ├── agent-worker/
│   ├── embedding-worker/
│   └── scheduler-worker/
│
├── content/
│   ├── maps/
│   ├── objects/
│   ├── actions/
│   ├── events/
│   ├── jobs/
│   ├── economy/
│   ├── characters/
│   └── art-manifest/
│
├── tools/
│   ├── map-importer/
│   ├── seed-generator/
│   ├── content-validator/
│   └── replay-dev-only/
│
├── deploy/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   └── scripts/
│
└── research/
    └── references/
```

## 2. shared 目录

`shared` 放所有前后端都需要理解的数据结构，不依赖 Cocos、Node、数据库或平台 API。

```text
shared/
├── protocol/
│   ├── ClientMessage.ts
│   ├── ServerMessage.ts
│   ├── WorldSnapshot.ts
│   └── WorldDelta.ts
│
├── schemas/
│   ├── action.schema.ts
│   ├── event.schema.ts
│   ├── object.schema.ts
│   ├── map.schema.ts
│   └── character.schema.ts
│
├── constants/
│   ├── action-codes.ts
│   ├── event-codes.ts
│   ├── region-types.ts
│   └── object-tags.ts
│
├── actions/
│   ├── ActionDefinition.ts
│   ├── ActionPhase.ts
│   └── ActionPresentation.ts
│
├── events/
│   ├── WorldEvent.ts
│   └── EventDefinition.ts
│
├── objects/
│   ├── ObjectTemplate.ts
│   ├── WorldObject.ts
│   └── InteractionPoint.ts
│
└── map/
    ├── MapRegion.ts
    ├── PlacementSlot.ts
    ├── NavGrid.ts
    └── Transform.ts
```

核心要求：

```text
shared 不能 import cocos
shared 不能 import express
shared 不能 import mysql/redis
shared 不能 import wx/tt/window/document
```

## 3. client 目录

```text
client/
├── core/
│   ├── store/
│   ├── net/
│   ├── world/
│   ├── action/
│   ├── ui-model/
│   └── platform/
│
├── cocos/
│   ├── assets/
│   │   ├── scenes/
│   │   ├── prefabs/
│   │   ├── sprites/
│   │   ├── animations/
│   │   ├── fonts/
│   │   └── ui/
│   └── scripts/
│       ├── boot/
│       ├── renderer2d/
│       ├── ui/
│       ├── platform/
│       └── adapters/
│
├── web-shell/
│   ├── index.html
│   ├── DebugPanel.tsx
│   └── main.ts
│
└── tools/
    ├── asset-checker.ts
    └── animation-capability-exporter.ts
```

### client/core

纯 TypeScript 逻辑：

- WorldStateStore。
- NetworkPort。
- PlatformAdapter 接口。
- ActionPresentationResolver。
- UI ViewModel。
- Snapshot/Delta 应用逻辑。

不能出现：

```text
Cocos Node
React
DOM
wx
tt
```

### client/cocos

Cocos 具体实现：

- 2D 小镇渲染。
- 正式游戏 UI。
- 头顶图标。
- 角色动画。
- 动态对象渲染。
- 微信/抖音/Web 平台适配实现。

### client/web-shell

只用于网页 Demo 和开发者调试：

- 嵌入 Cocos Web Canvas。
- React DebugPanel。
- 查看世界状态、NPC 任务、WebSocket、事件日志。

这个目录不进入微信/抖音正式包。

## 4. server 目录

```text
server/src/
├── app/
│   ├── http-server.ts
│   ├── ws-server.ts
│   └── bootstrap.ts
│
├── domain/
│   ├── world/
│   ├── character/
│   ├── object/
│   ├── map/
│   ├── action/
│   ├── event/
│   ├── economy/
│   ├── job/
│   ├── animal/
│   └── memory/
│
├── engine/
│   ├── WorldRuntime.ts
│   ├── WorldClock.ts
│   ├── SimulationModeController.ts
│   ├── ActionExecutor.ts
│   ├── PlacementRuleEngine.ts
│   ├── SpatialIndex.ts
│   ├── PathfindingService.ts
│   └── SnapshotService.ts
│
├── agent/
│   ├── AgentScheduler.ts
│   ├── BehaviorTreeRunner.ts
│   ├── GoalPlanner.ts
│   ├── PerceptionService.ts
│   └── IntentTranslator.ts
│
├── llm/
│   ├── LlmProvider.ts
│   ├── LlmRouter.ts
│   ├── PromptBuilder.ts
│   ├── JsonRepair.ts
│   └── providers/
│
├── memory/
│   ├── MemoryService.ts
│   ├── MemoryRetrievalService.ts
│   ├── ReflectionService.ts
│   └── DiaryService.ts
│
├── infra/
│   ├── db/
│   ├── redis/
│   ├── queue/
│   ├── logger/
│   └── config/
│
└── api/
    ├── routes/
    ├── ws/
    └── dto/
```

## 5. content 目录

`content` 存放可以不断扩展的内容数据，尽量 JSON/YAML 化。

```text
content/
├── maps/
│   ├── jiangnan_village_base.tmj
│   ├── jiangnan_village_regions.json
│   ├── jiangnan_village_slots.json
│   └── jiangnan_village_navgrid.json
│
├── objects/
│   ├── furniture.json
│   ├── decor.json
│   ├── farm.json
│   ├── stable.json
│   └── tools.json
│
├── actions/
│   ├── basic_actions.json
│   ├── farming_actions.json
│   ├── fishing_actions.json
│   ├── horse_actions.json
│   └── home_actions.json
│
├── events/
│   ├── life_events.json
│   ├── work_events.json
│   ├── economy_events.json
│   └── map_change_events.json
│
├── jobs/
│   ├── job_roles.json
│   └── job_task_templates.json
│
├── economy/
│   ├── item_prices.json
│   └── initial_accounts.json
│
├── characters/
│   ├── initial_characters.json
│   └── personality_traits.json
│
└── art-manifest/
    ├── sprite_packs.json
    ├── animation_capabilities.json
    └── icon_manifest.json
```

## 6. tools 目录

工具尽量命令行化，方便 vibercoding 单独实现。

```text
tools/
├── map-importer/
│   ├── import-tiled-map.ts
│   ├── validate-regions.ts
│   └── build-navgrid.ts
│
├── seed-generator/
│   ├── generate-world-seed.ts
│   └── validate-world-seed.ts
│
├── content-validator/
│   ├── validate-actions.ts
│   ├── validate-events.ts
│   ├── validate-objects.ts
│   └── validate-jobs.ts
│
└── replay-dev-only/
    └── event-log-viewer.ts
```

注意：项目第一阶段不做玩家回放，但开发侧可以保留事件日志查看工具。

## 7. 最小落地顺序

建议先建目录，再做空接口和假数据：

```text
1. shared/protocol
2. server/domain
3. server/engine/WorldRuntime
4. client/core/WorldStateStore
5. client/cocos/renderer2d
6. content/actions + content/objects
7. content/maps
8. API + WebSocket
9. AgentScheduler + BehaviorTree
10. LLM 接入
```
