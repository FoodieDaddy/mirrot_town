# 99. 参考资料与源文件说明

## 1. 本项目已有源文件

本文件夹内 `source_notes/` 收录了当前会话中提供的两个源文件副本：

```text
source_notes/PROJECT_PRESENTATION_original.md
source_notes/architecture_and_optimization_original.md
```

它们描述了镜中边城 当前的 TypeScript + Phaser/React + Node/Express/WebSocket + SQLite 方案，以及异步模拟、LLM 决策、RAG 记忆、事件回放、AIGC 地图生成等原始方向。

本重构计划基于这些源文件做了调整：

- 从 Phaser/React 长期主客户端转向 Cocos Creator 多平台前端。
- 从玩家回放转向 Snapshot + LiveDelta + 小镇日报。
- 从多人联机改为多人旁观。
- 从静态地图转向模块化动态对象地图。
- 从 LLM 直接决策转向行为树 + LLM 意图 + 规则执行。

## 2. 平台与引擎参考

以下链接用于确认 Cocos Creator 对多平台发布、微信小游戏、抖音小游戏的官方支持情况。实际实现时请以对应版本的最新官方文档为准。

- Cocos Creator 3.8 多平台发布文档：
  - https://docs.cocos.com/creator/3.8/manual/en/editor/publish/index.html
- Cocos Creator 发布到微信小游戏：
  - https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-wechatgame.html
- Cocos Creator 发布到抖音小游戏：
  - https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-bytedance-mini-game.html
- Cocos Creator 小游戏平台发布总览：
  - https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-mini-game.html

## 3. 架构参考原则

本计划采用以下工程原则：

```text
权威服务器
单 WorldRuntime
多 Viewer 订阅
Snapshot + LiveDelta
行为树优先
LLM 异步化
事件日志用于追踪，不用于玩家回放
内容表驱动
前端剥离式多平台架构
```

## 4. 历史与美术参考注意

项目设定参考三国时期江南村落，但不是严格历史复原模拟。

目标是：

```text
历史气质可信
生活逻辑自洽
美术风格统一
系统可玩可扩展
```

后续如果需要更严谨的历史考据，应单独建立：

```text
docs/research/history_jiangnan_three_kingdoms.md
```

并整理：

- 建筑样式。
- 服饰。
- 农具。
- 货币称谓。
- 村落组织。
- 江南三国时期地理与生产方式。
