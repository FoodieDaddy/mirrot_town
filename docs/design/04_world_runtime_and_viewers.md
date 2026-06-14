# 04. 小镇常驻运行与多人浏览

## 1. 当前选择

第一阶段不做多人联机，但允许很多人同时打开网页观看。

这意味着：

```text
多人浏览 ≠ 多人游戏
```

## 2. 一镇多看

正确模式：

```text
一个 WorldRuntime
一份世界状态
多个 Viewer 订阅同一个状态
```

错误模式：

```text
每个用户打开网页都启动一个小镇
```

这会导致 NPC、Tick、数据库写入、LLM 成本全部按用户数倍增。

## 3. Viewer 的定义

Viewer 是旁观者。

权限：

```text
可以看小镇
可以拉当前 snapshot
可以接收 world_delta
可以看公开事件/日报
不能改变世界
不能触发 LLM
不能被 NPC 感知
不能发玩家指令
```

## 4. ViewerHub

```ts
class ViewerHub {
  private clients: Set<GameSocket>;

  add(client: GameSocket): void;
  remove(client: GameSocket): void;
  broadcast(delta: WorldDelta): void;
  broadcastStatus(status: WorldStatus): void;
}
```

广播时同一份消息只序列化一次：

```ts
const text = JSON.stringify(delta);
for (const client of clients) {
  if (client.isOpen()) client.send(text);
}
```

## 5. 慢客户端处理

如果客户端网络太差，不能拖住全体广播。

策略：

```text
1. 检查 bufferedAmount
2. 超过阈值则发送 resync_required
3. 断开连接
4. 客户端重连后重新拉 snapshot
```

## 6. Snapshot 与 Delta

进入页面：

```text
GET /api/worlds/default/snapshot
```

之后：

```text
WS /ws/worlds/default
```

WebSocket 只发实时变化，不补历史。

用户断线重连：

```text
重新拉最新 snapshot
```

这符合“不做玩家回放”的要求。

## 7. 不做回放，但保留事件日志

玩家不看回放。开发者要查事件。

事件日志记录：

```text
动作开始
动作完成
对象新增/移除/状态变化
工作任务完成
金钱交易
关系变化
记忆生成
异常
```

不记录：

```text
每帧坐标
每 16ms 动画状态
每个 tween 中间值
```

## 8. 在线/离线运行模式

### ONLINE_REALTIME

有 Viewer 在线：

```text
World Tick: 5 TPS
Agent Think: 10-30 秒一次
WS 推送: 2-5 次/秒
LLM: 正常限流
```

### OFFLINE_LOW_FREQ

无人在线：

```text
World Tick: 0.2-1 TPS
Agent Think: 1-5 分钟一次
LLM: 严格限流
事件: 只记录关键事件
```

### SUMMARY_ADVANCE

长时间无人：

```text
每 10-30 分钟推进一段生活摘要
生成关键结果和日报素材
```

## 9. 上线时的小镇日报

玩家上线后，不补播过去，而是看摘要。

例如：

```text
过去 6 小时：
- 阿衡完成了马棚喂草，得 3 钱。
- 林娘在自家门前种下两盆野花。
- 南田小麦进入成熟期。
- 木匠修好了河边的木桥。
```

## 10. 并发压力点

多人浏览压力主要来自：

```text
静态资源下载
WebSocket 连接数
状态广播带宽
JSON 序列化
慢客户端积压
```

不应该来自：

```text
世界模拟数量
NPC 思考数量
LLM 调用数量
数据库写入数量
```

## 11. 扩展路线

### 几十人

```text
单 ECS + Nginx + Node + MySQL + Redis
```

### 几百人

```text
CDN/OSS 托管静态资源
ECS 跑后端
Redis 缓存 snapshot
```

### 上千人

```text
World Engine 单实例
Redis PubSub/Stream
多个 WS Gateway
```

注意：World Engine 不能多开同时推进同一个 world，除非有严格 leader lock。

## 12. 必要锁

```text
world_runtime_lock:{worldId}
```

只有拿到锁的进程能推进小镇。

## 13. 第一阶段接口

```text
GET /api/worlds/default/status
GET /api/worlds/default/snapshot
GET /api/worlds/default/digest
WS  /ws/worlds/default
```

WebSocket 消息：

```text
world_snapshot
world_delta
world_status
server_ping
resync_required
error
```
