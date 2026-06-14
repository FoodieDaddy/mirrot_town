# 10. API 与 WebSocket 协议

## 1. 协议原则

```text
协议独立于 Cocos/Phaser/React
协议独立于 Web/微信/抖音
前端只接收当前状态和实时变化
不做历史补播
```

## 2. HTTP API

### 健康检查

```text
GET /api/health
```

返回：

```json
{
  "ok": true,
  "serverTime": 1710000000000
}
```

### 世界状态

```text
GET /api/worlds/default/status
```

返回：

```json
{
  "worldId": "default",
  "status": "RUNNING",
  "simulationMode": "ONLINE_REALTIME",
  "viewerCount": 12,
  "gameTime": {
    "day": 3,
    "hour": 9,
    "minute": 20,
    "season": "spring"
  }
}
```

### 当前快照

```text
GET /api/worlds/default/snapshot
```

返回：

```json
{
  "type": "world_snapshot",
  "worldId": "default",
  "snapshotVersion": 1024,
  "seq": 101,
  "serverTime": 1710000000000,
  "gameTime": {
    "day": 3,
    "hour": 9,
    "minute": 20
  },
  "map": {},
  "regions": [],
  "objects": [],
  "characters": [],
  "animals": [],
  "publicEvents": []
}
```

### 小镇日报

```text
GET /api/worlds/default/digest?hours=6
```

返回：

```json
{
  "worldId": "default",
  "range": "last_6_hours",
  "items": ["阿衡完成了马棚喂草，得 3 钱。", "林娘在门前种下两盆野花。"]
}
```

## 3. WebSocket 地址

```text
WS /ws/worlds/default?clientId=xxx
```

第一阶段 viewer 不需要登录。后续可以加 token。

## 4. 消息基础格式

```ts
export type ServerMessage = {
  type: string;
  worldId: string;
  seq: number;
  serverTime: number;
  payload: unknown;
};
```

```ts
export type ClientMessage = {
  type: string;
  worldId: string;
  clientSeq: number;
  payload?: unknown;
};
```

## 5. 客户端消息

### viewer_join

```json
{
  "type": "viewer_join",
  "worldId": "default",
  "clientSeq": 1,
  "payload": {
    "clientVersion": "0.1.0",
    "platform": "web"
  }
}
```

### ping

```json
{
  "type": "ping",
  "worldId": "default",
  "clientSeq": 2
}
```

第一阶段不开放 player_command。

## 6. 服务端消息

### world_status

```json
{
  "type": "world_status",
  "worldId": "default",
  "seq": 100,
  "serverTime": 1710000000000,
  "payload": {
    "simulationMode": "ONLINE_REALTIME",
    "viewerCount": 8
  }
}
```

### world_delta

```json
{
  "type": "world_delta",
  "worldId": "default",
  "seq": 101,
  "serverTime": 1710000000100,
  "payload": {
    "changes": [
      {
        "type": "character_action_started",
        "characterId": "lin_niang",
        "actionCode": "plant_flower",
        "targetObjectId": "slot_decor_01",
        "durationMs": 4000
      }
    ]
  }
}
```

### resync_required

```json
{
  "type": "resync_required",
  "worldId": "default",
  "seq": 102,
  "serverTime": 1710000000200,
  "payload": {
    "reason": "client_lagged"
  }
}
```

客户端收到后重新请求 snapshot。

### error

```json
{
  "type": "error",
  "worldId": "default",
  "seq": 103,
  "serverTime": 1710000000300,
  "payload": {
    "code": "INVALID_MESSAGE",
    "message": "Unknown message type"
  }
}
```

## 7. WorldDelta 类型

### character_moved

```json
{
  "type": "character_moved",
  "characterId": "a_heng",
  "from": { "x": 10, "y": 20 },
  "to": { "x": 18, "y": 22 },
  "durationMs": 3000
}
```

### character_action_started

```json
{
  "type": "character_action_started",
  "characterId": "a_heng",
  "actionCode": "fish",
  "phases": [
    { "phaseCode": "sit_down", "durationMs": 1000 },
    { "phaseCode": "cast_line", "durationMs": 1200 },
    { "phaseCode": "wait_bite", "durationMs": 6000 }
  ]
}
```

### object_added

```json
{
  "type": "object_added",
  "objectId": "flower_pot_001",
  "templateId": "flower_pot",
  "regionId": "home_lin_001",
  "position": { "x": 12, "y": 8 },
  "state": { "growth": "seedling" }
}
```

### object_state_changed

```json
{
  "type": "object_state_changed",
  "objectId": "wheat_crop_001",
  "patch": {
    "growth": "mature",
    "moisture": 42
  }
}
```

### event_created

```json
{
  "type": "event_created",
  "event": {
    "eventCode": "wage_paid",
    "actorId": "a_heng",
    "visibility": "public",
    "text": "阿衡完成喂马，得 3 钱。"
  }
}
```

## 8. 前端处理规则

```text
首次进入先拉 snapshot
WebSocket 只接 delta
snapshot 的 seq 是该快照已包含的最后事件序号
忽略 seq 小于等于 snapshot seq 的旧 delta
seq 跳号太多，直接 resync
不补播历史
不让前端推导世界规则
```

## 9. 后续预留

后期玩家可交互时再加：

```text
player_command
command_ack
command_rejected
```

但第一阶段不开放。
