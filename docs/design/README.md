# 镜中边城：项目重构与实现计划

本文件夹是一套给开发者与 vibercoding 协作使用的 Markdown 项目文档。目标是把当前镜中边城 从“网页实验 demo”整理成一个可长期演进的多平台 AI 小镇模拟项目。

## 当前确定方向

- **题材背景**：参考中国三国时期的江南小村落，一个远离战火、以民生与生产为核心的村庄。
- **第一阶段目标**：一个小镇持续运行，不做多人联机，不做玩家暂停，不做玩家回放。
- **浏览模式**：多人可以同时打开网页观看，但所有浏览者都是旁观者；小镇只运行一份。
- **前端方向**：剥离式多平台前端。先做网页 Demo，后续转微信小游戏、抖音小游戏，远期保留第一人称/3D 客户端可能性。
- **推荐主前端引擎**：Cocos Creator 3.x + TypeScript。正式 UI 放引擎内，React 只可作为 Web 调试面板。
- **后端方向**：权威服务器 + 常驻 WorldRuntime + 异步 Agent Worker。LLM 不能阻塞世界 Tick。
- **地图方向**：静态地形底板 + 动态世界对象 + 放置槽位 + AI 可改造对象层。
- **系统方向**：动作表、事件表、动画能力表、岗位表、工作任务表、经济表都数据驱动。
- **远期规划**：村落逐步发展为围寨/坞堡，引入守夜、民兵、防御建筑、敌对 AI 与战斗系统；但这些只进入远期规划，第一阶段不实现。

## 文档目录结构

```text
docs/design/
├── README.md
├── 00_project_brief.md
├── 01_directory_structure.md
├── 02_frontend_architecture.md
├── 03_backend_architecture.md
├── 04_world_runtime_and_viewers.md
├── 05_modular_map_and_content.md
├── 06_action_event_animation_system.md
├── 07_ai_agent_goal_memory_system.md
├── 08_economy_job_money_system.md
├── 09_database_schema_draft.md
├── 10_api_and_websocket_protocol.md
├── 11_art_style_and_ui_guideline.md
├── 12_deployment_and_ops.md
├── 13_roadmap.md
├── 14_vibecoding_task_board.md
├── 99_references.md
└── source_notes/
    ├── PROJECT_PRESENTATION_original.md
    └── architecture_and_optimization_original.md
```

## 推荐阅读顺序

1. `00_project_brief.md`：先确定项目边界和核心原则。
2. `01_directory_structure.md`：确定仓库结构，避免一开始乱放代码。
3. `02_frontend_architecture.md`：前端剥离式架构，最关键。
4. `03_backend_architecture.md`：常驻小镇运行架构。
5. `05_modular_map_and_content.md`：地图、对象、槽位、AI 改造世界。
6. `06_action_event_animation_system.md`：动作/事件/动画能力的表驱动方案。
7. `08_economy_job_money_system.md`：金钱、工作、岗位。
8. `09_database_schema_draft.md`：数据库草案。
9. `14_vibecoding_task_board.md`：直接拆任务给 vibercoding 实现。
10. `15_house_roof_visibility.md`：房屋屋顶的 Viewer 本地显示规则。

## 第一阶段 MVP 一句话

> 一个参考三国时期江南风貌的小村落，5-10 个 NPC 持续生活：种田、捕鱼、养马、做工、赚钱、买东西、布置家、形成记忆和关系；很多人可以打开网页观看，但他们只是旁观者。
