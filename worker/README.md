# 异步 Worker

Worker 不参与世界主 Tick，只处理可延迟、可重试的任务：

- `agent-worker`：LLM 意图、对话、反思和日记。
- `embedding-worker`：记忆向量化。
- `scheduler-worker`：低频摘要和维护任务。

Sprint 0/1 暂不启动这些进程，世界在没有 LLM、Redis 和数据库时仍必须持续运行。
