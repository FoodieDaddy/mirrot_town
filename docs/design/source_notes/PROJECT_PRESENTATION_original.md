# 镜中边城：AI 驱动的多智能体沙盒模拟器 (AI Multi-Agent Sandbox)

## 📖 项目简介
镜中边城是一个基于大语言模型（LLM）驱动的前沿多智能体（Multi-Agent）沙盒模拟平台。该项目结合了生成式 AI 与 2D 游戏引擎，旨在创建一个角色拥有自主意识、记忆、情感和日常行为的动态虚拟世界。在未来，本项目计划支持最多 4 人联机互动，并向微信小游戏等全平台生态演进。

---

## 🌟 核心特性 (Features)

### 1. 完全由 LLM 驱动的智能体 (Autonomous AI Agents)
- **自主决策与寻路**：角色不是按固定脚本行动，而是通过大模型根据当前环境、记忆和情绪，自主决定行动，并结合 A* 算法在 2D 贴图网格上自动寻路。
- **动态记忆系统 (RAG)**：角色拥有长短期记忆。通过文本向量化（Embedding）存储每次交互与反思，通过上下文检索唤醒记忆，影响决策。
- **全自然语言对话**：抛弃传统游戏的选择题分支，角色的对话、心理活动（Inner Monologue）和世界互动全部通过大模型实时生成。

### 2. AIGC 自动化世界生成管线 (Procedural World Generation)
项目包含一套结合了结构化 LLM 规划与视觉大模型（Vision Model）的自动化生成管线：
- **世界设计器 (Orchestrator)**：一句话输入（Prompt），大模型自动输出结构化的世界观、功能区域、交互元素和角色设定 JSON。
- **地图生成管线 (Map Generator)**：
  1. 生成 2D 游戏底图。
  2. 使用视觉模型提取地图中的**可行走区域 (Walkable Areas)**，并计算生成离散寻路网格（Grid）。
  3. 自动识别和定位预设的功能区域坐标，打包为游戏引擎直接可读的 `.tmj` 文件。

### 3. 高性能异步模拟引擎
- 具备完整的时间流动机制（Game Tick/Day/Night Cycle），解耦大模型的网络高延迟与游戏物理状态的实时同步。
- 采用大模型池自适应路由与负载均衡策略，根据任务复杂度自动调度不同权重的大模型，兼顾性能与成本。

---

## 🏗️ 架构设计 (Architecture)

镜中边城目前采用全栈 TypeScript 架构，分为以下核心模块：

### 前端系统 (Client) - `client/`
- **渲染引擎**：Phaser 3，负责 2D 像素/贴图风格画面的渲染、角色移动（Tween动画）、摄像机控制、碰撞与寻路解析。
- **UI 框架**：React，负责呈现游戏外部的设置界面、对话面板和信息提示。

### 后端系统 (Server) - `server/`
- **运行环境**：Node.js (TypeScript) + Express/WebSocket。
- **核心引擎 (Simulation Engine)**：管理世界状态、时钟节拍（Tick）、角色调度队列，处理前端请求和状态广播。
- **大模型客户端 (LLM Client)**：封装了主流大模型 API，支持流式对话、Embedding 向量化、结构化输出校验以及自适应路由池。
- **数据库**：SQLite (当前)，未来计划迁移至 PostgreSQL (配合 `pgvector`)。

---

## 🔍 核心实现细节 (Implementation Details)

### 1. 自适应大模型路由池 (Adaptive LLM Pool)
- 系统支持在 `.env` 中配置多个大模型（如 Gemini Flash, DeepSeek, Claude Sonnet），并为每个模型赋予“能力权重”。
- 在进行如“快速移动判定”等简单任务时，调度器会自动轮询路由至低成本的轻量模型；在进行“核心剧情对话”时，调度器会将请求发往权重最高的高级模型。这极大地优化了 API 成本与响应速度。

### 2. 世界时钟与异步回放控制 (Tick & Playback Controller)
- **后端 Tick 循环**：世界的流逝被切分为离散的 Game Tick。在每个 Tick 内，系统会将世界感知（Perception）喂给角色的 Decision Maker（LLM），生成 Action（如 `move_to`, `talk_to`）。
- **前端 Playback**：由于 LLM 的网络请求通常需要数秒，如果让客户端同步等待会导致画面卡顿。因此引入了 `PlaybackController`，前端通过事件队列（EventQueue）异步获取后端结算好的历史 Tick 动作，利用补间动画平滑播放在 Phaser 画布上。

### 3. RAG 动态记忆检索
- 当角色尝试做出反应时，系统会提取周围的实体（地点、人物名字）作为上下文关键词，使用 Embedding 模型将其向量化。
- 随后通过余弦相似度从数据库计算并提取最高相关性的历史事件和人物评价，作为 Prompt 的额外上下文传递给大语言模型，从而实现“拥有连续记忆的 NPC”。

---

## 🗄️ 数据库设计 (Database Schema)

项目当前采用 **SQLite (WAL 模式)** 进行数据持久化，所有核心状态与记忆都由以下数据表承载：

1. `memories` (记忆表)
   - 存储角色的长短期记忆与微反思。包含情感极性（`emotional_valence`）、重要性评分（`importance`）、JSON 序列化后的嵌入向量（`embedding`）以及相关实体（人物、地点）。
2. `events` (事件记录表)
   - 记录沙盒世界中发生的所有宏观事件（对话、移动、动作），不仅用于日志溯源，也是触发后续回忆与日记生成的重要原始材料。
3. `character_states` (角色状态表)
   - 实时持久化角色的当前位置坐标、正在执行的动作（`current_action`）、目标（`long_term_goal`）以及情绪状态（好奇心、唤醒度等），供引擎在重启或奔溃恢复时快速复原世界状态。
4. `world_object_states` (世界对象表)
   - 记录农作物、公共设施等可交互元素的状态变迁（如生长阶段、占用情况等）。
5. `diary_entries` (日记表)
   - 每天结束时，大模型会根据角色全天经历的 `events` 和提取的 `memories`，自动生成富有感情的角色日记并持久化。
6. `llm_call_logs` (大模型调用日志表)
   - 用于成本统计与监控分析。记录每一次大模型调用的 Task Type、Token 消耗量、请求耗时与报错信息。

---

## 🚀 未来演进路线 (Roadmap)

1. **多人联机支持 (Co-op Multiplayer)**
   - 引入房间机制 (Room/Session)，允许最多 4 名玩家加入同一个沙盒世界。
   - 升级为权威服务器（Authoritative Server），实现玩家操作与 AI 决策指令的协调与增量状态同步（Delta Sync）。

2. **微信小游戏全平台适配 (WeChat Mini Game)**
   - 将现有 React 外部 UI 逐步迁移至 Phaser 内部原生 UI，剥离对浏览器 DOM/BOM 的依赖。
   - 整合微信云托管 (CloudBase)，实现免鉴权登录、低延迟 WebSocket 通信，并优化打包体积。

3. **企业级架构升级 (Enterprise Backend)**
   - **数据库迁移**：从 SQLite 迁移至 PostgreSQL，原生集成 `pgvector` 取代目前的弱结构化 Embedding 存储。
   - **计算解耦**：将 CPU 密集型任务（如 A* 寻路计算）从 Node.js 主线程剥离到 Worker Threads。