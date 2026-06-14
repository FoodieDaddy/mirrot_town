# 镜中边城实现状态

## 命名

- 产品全名：镜中边城
- 工程 slug：`jingzhong-biancheng`
- npm scope：`@jingzhong-biancheng`
- 数据库名：`jingzhong_biancheng`

## 当前里程碑

当前实现对应任务板 Sprint 0 和 Sprint 1：

1. pnpm monorepo 与目录边界。
2. 平台无关的共享协议。
3. 内存版单实例 `WorldRuntime`。
4. Health、Status、Snapshot HTTP API。
5. 只读 Viewer WebSocket。
6. 客户端 `WorldStateStore` 和 Web 观察壳。

MySQL、Redis、LLM、Embedding 与正式 Cocos 场景不进入本里程碑。

## 协议决定

- `seq` 是单世界、进程内单调递增的事件序号。
- Snapshot 携带当前 `seq`，客户端据此忽略旧 Delta 并发现跳号。
- WebSocket 不补历史；发生跳号或背压时，客户端重新获取 Snapshot。
- Viewer 不能提交改变世界的命令。

后续接入持久化时，`seq` 必须随世界快照恢复，不能在服务重启后无条件归零。
