# 03. 后端架构

## 1. 后端目标

后端负责维护一个持续运行的小镇。

它不是为每个用户开房间，而是：

```text
一个世界实例
一份权威状态
多个旁观者订阅
异步 AI 决策
规则引擎执行动作
```

## 2. 总体结构

```text
HTTP / WebSocket API
        ↓
WorldRuntime
        ↓
ActionExecutor / RuleEngine / SnapshotService
        ↓
Database + Redis
        ↓
AgentScheduler / AgentWorker
        ↓
LLM / Embedding Service
```

## 3. 模块划分

### app

启动 Express/Fastify、WebSocket、定时器、健康检查。

### domain

纯领域模型，不依赖数据库、网络、LLM。

包括：

- world
- character
- object
- map
- action
- event
- economy
- job
- animal
- memory

### engine

小镇运行核心。

包括：

- WorldRuntime
- WorldClock
- SimulationModeController
- ActionExecutor
- PlacementRuleEngine
- SpatialIndex
- PathfindingService
- SnapshotService

### agent

AI 与行为决策。

包括：

- AgentScheduler
- BehaviorTreeRunner
- GoalPlanner
- PerceptionService
- IntentTranslator

### llm

所有 LLM 调用统一入口。

包括：

- LlmProvider
- LlmRouter
- PromptBuilder
- JsonRepair
- providers

### memory

记忆、反思、日记。

包括：

- MemoryService
- MemoryRetrievalService
- ReflectionService
- DiaryService

### infra

数据库、Redis、队列、日志、配置。

### api

REST/WS DTO 和协议适配。

## 4. WorldRuntime

WorldRuntime 是常驻小镇进程。

职责：

```text
1. 加载世界快照
2. 加载当前角色/对象/任务
3. 启动世界时钟
4. 执行命令队列
5. 更新世界状态
6. 生成事件
7. 推送 delta 给 ViewerHub
8. 定期保存快照
```

伪代码：

```ts
class WorldRuntime {
  async start(worldId: string) {
    await this.loadSnapshot(worldId);
    this.clock.start();
  }

  tick(deltaMs: number) {
    this.simulationModeController.update();
    this.actionExecutor.executeDueActions(deltaMs);
    this.worldState.update(deltaMs);
    this.snapshotService.maybePersist();
    this.viewerHub.broadcastPendingDeltas();
  }
}
```

## 5. Tick 设计

不需要高频后端同步。

建议：

```text
在线实时模式：5 TPS
无人低频模式：0.2-1 TPS
摘要推进模式：几分钟推进一次生活段落
```

前端 60 FPS 只是本地渲染，不代表后端要 60 FPS。

## 6. SimulationModeController

模式：

```text
ONLINE_REALTIME
OFFLINE_LOW_FREQ
SUMMARY_ADVANCE
MAINTENANCE
```

规则：

| 模式             | 触发条件     | 作用                   |
| ---------------- | ------------ | ---------------------- |
| ONLINE_REALTIME  | 有浏览者在线 | 正常 Tick 和推送       |
| OFFLINE_LOW_FREQ | 无浏览者在线 | 降低 Tick 和 LLM 频率  |
| SUMMARY_ADVANCE  | 长时间无人   | 抽象推进生活事件       |
| MAINTENANCE      | 异常/运维    | 玩家侧不可见，系统冻结 |

注意：玩家侧“不暂停”，但系统侧必须有维护冻结能力。

## 7. 命令与动作

LLM 或行为树不直接修改世界，只提交 Command。

```ts
export type Command =
  | MoveToCommand
  | PlaceObjectCommand
  | WorkTaskCommand
  | BuyItemCommand
  | TalkCommand
  | UseObjectCommand
  | WaitCommand;
```

Command 进入队列后，由 ActionExecutor 执行。

## 8. ActionExecutor

职责：

```text
1. 检查动作定义
2. 检查前置条件
3. 检查目标对象/交互点
4. 检查路径和碰撞
5. 拆成 ActionPhase
6. 更新角色状态
7. 生成世界事件
8. 更新对象/钱/物品/关系
```

## 9. RuleEngine

所有关键修改都要过规则引擎。

包括：

- CanMoveRule
- CanPlaceObjectRule
- CanBuyItemRule
- CanTakeJobRule
- CanCompleteWorkTaskRule
- CanUseObjectRule
- CanModifyRelationshipRule

不要相信 LLM 输出。

## 10. AgentScheduler

AgentScheduler 定期为 NPC 生成 operation。

```text
1. 读取 NPC 当前状态
2. 行为树先判断
3. 若简单日常：直接生成 Command
4. 若开放选择：创建 AgentOperation
5. AgentWorker 异步调用 LLM
6. LLM 输出意图
7. IntentTranslator 转为 Command/Goal/Task
```

## 11. BehaviorTree 优先

这些不应该频繁调用 LLM：

```text
饿了找吃的
渴了喝水
困了回家睡觉
农田干了浇水
马饿了喂马
工作时间去岗位
作物成熟收割
```

LLM 用于：

```text
开放性目标
关系判断
对话
反思
突发事件
审美/装饰选择
长期规划
```

## 12. LLM 隔离

LLM 调用必须全部进入 AgentOperation。

状态：

```text
PENDING
RUNNING
SUCCEEDED
FAILED
RETRYING
CANCELLED
```

LLM 超时、失败、JSON 不合法，都不能阻塞世界 Tick。

## 13. 数据持久化

至少保留：

```text
当前状态快照
世界对象
角色状态
工作任务
金钱流水
事件日志
记忆
LLM 调用日志
```

玩家不需要回放，但开发者需要事件日志查原因。

## 14. 推荐第一版服务列表

```text
jingzhong-biancheng-server       # HTTP + WS + WorldRuntime
agent-worker        # LLM/反思/记忆任务
embedding-service   # 可选，Qwen3-Embedding 等
mysql               # 主数据库
redis               # 锁/队列/热状态缓存
nginx               # 静态资源和反代
```

## 15. 后端第一阶段实现顺序

```text
1. 建立 server/src 目录
2. 实现 domain 模型
3. 实现内存版 WorldRuntime
4. 实现 snapshot API
5. 实现 ViewerHub WebSocket
6. 实现 action_definitions 加载
7. 实现 ActionExecutor 基础动作
8. 实现 world_events 日志
9. 接入 MySQL
10. 接入 Redis
11. 实现 AgentScheduler 行为树
12. 接入 LLM Provider
13. 实现记忆和日报
```
