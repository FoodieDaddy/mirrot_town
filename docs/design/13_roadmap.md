# 13. 路线图

## 阶段 0：项目整理

目标：建立仓库结构和基础协议。

交付：

```text
目录结构
shared protocol
基础数据库迁移
Cocos 空项目
server 空服务
.env.example
```

验收：

```text
前端能启动空场景
后端能启动 health API
shared 类型能被前后端引用
```

## 阶段 1：网页 Demo 基础小镇

目标：网页能显示一个静态江南村落。

交付：

```text
Cocos Web Demo
静态地图
5 个 NPC 显示
基础 camera
对象显示
```

验收：

```text
浏览器打开看到小村落
NPC 能在地图上显示
基础 UI 风格确定
```

## 阶段 2：常驻 WorldRuntime

目标：后端持续推进小镇，前端订阅当前状态。

交付：

```text
WorldRuntime
WorldClock
Snapshot API
WebSocket ViewerHub
WorldDelta
```

验收：

```text
多个浏览器看到同一个小镇状态
小镇只运行一份
断线重连后拉最新 snapshot
```

## 阶段 3：基础动作与事件

目标：NPC 能走动、等待、坐下、互动对象。

交付：

```text
action_definitions
action_phases
event_definitions
ActionExecutor
头顶图标 fallback
```

验收：

```text
NPC 能 move_to / wait / sit / fetch_water
动作会产生日志事件
缺动画时显示图标
```

## 阶段 4：模块化地图与动态对象

目标：AI/系统能在槽位中改变地图对象。

交付：

```text
object_templates
world_objects
placement_slots
interaction_points
PlacementRuleEngine
object_added/object_state_changed delta
```

验收：

```text
能在家里放床
能在门口种花
前端能实时显示新增对象
```

## 阶段 5：种田、捕鱼、养马

目标：三大生活生产系统可跑。

交付：

```text
farm_plots
crop lifecycle
fishing action
animals
stable objects
horse care actions
```

验收：

```text
作物能播种/浇水/成熟/收割
NPC 能钓鱼
马需要吃草喝水，NPC 能照顾马
```

## 阶段 6：金钱、岗位、工作

目标：NPC 可以工作赚钱和消费。

交付：

```text
accounts
money_transactions
businesses
job_roles
character_jobs
work_tasks
job_task_templates
item_price_definitions
```

验收：

```text
农场/马棚/工坊能发布任务
NPC 能接任务并获得工钱
NPC 能用钱买花种/床/干草
```

## 阶段 7：Agent 目标与行为树

目标：NPC 不只是随机行动，而是有目标。

交付：

```text
character_needs
agent_goals
agent_tasks
BehaviorTreeRunner
GoalPlanner
```

验收：

```text
睡不好会想买床
钱不够会找工作
马饿了会喂马
作物干了会浇水
```

## 阶段 8：LLM 对话与开放目标

目标：接入 LLM，但不阻塞世界。

交付：

```text
AgentOperation
LlmProvider
PromptBuilder
IntentTranslator
对话系统
开放目标生成
```

验收：

```text
NPC 可以自然语言对话
LLM 可以提出装饰家/改善生活等意图
LLM 失败时小镇继续运行
```

## 阶段 9：记忆、关系、日报

目标：世界行为能被记住和总结。

交付：

```text
memories
relationships
memory retrieval
diary_entries
village_digests
```

验收：

```text
NPC 记得重要事件
关系会变化
玩家上线看到村中日报
```

## 阶段 10：微信小游戏适配

目标：同一套客户端发布微信小游戏。

交付：

```text
WechatPlatformAdapter
Cocos 微信构建
远程资源配置
WSS 域名配置
正式 UI 无 DOM 依赖
```

验收：

```text
微信开发者工具可运行
真机可打开小镇
能连接后端 WSS
```

## 阶段 11：抖音小游戏适配

目标：同一套客户端发布抖音小游戏。

交付：

```text
DouyinPlatformAdapter
Cocos 抖音构建
合法域名配置
资源加载验证
```

验收：

```text
抖音开发者工具可运行
真机可打开小镇
能连接后端 WSS
```

## 阶段 12：远期防御系统预研

只做预留，不进第一阶段主线。

内容：

```text
建筑耐久
围栏/寨门对象模板
守夜岗位
警戒事件
敌对 AI 接口
简单战斗模型草案
```

## 阶段 13：村落到坞堡

远期正式扩展。

路线：

```text
村落
→ 竹篱/木栅
→ 寨门/瞭望台
→ 守夜/民兵
→ 小股敌人袭扰
→ 村落防御战
→ 坞堡化
```

## 阶段 14：第一人称客户端

远期探索。

原则：

```text
不推翻后端
不推翻对象/事件/动作系统
只新增 3D Renderer/Client
读取同一套 world snapshot/delta
```
