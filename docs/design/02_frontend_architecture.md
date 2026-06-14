# 02. 前端剥离式架构

## 1. 总原则

前端不要按“网页游戏”写，而要按“多平台游戏客户端”写。

```text
网页 Demo 只是第一层壳。
未来目标包括微信小游戏、抖音小游戏，远期可能做第一人称。
```

因此必须做到：

```text
核心逻辑剥离
渲染层可替换
平台 API 可替换
UI 不依赖浏览器 DOM
网络协议与引擎无关
```

## 2. 推荐前端引擎

推荐：

```text
Cocos Creator 3.x + TypeScript
```

原因：

- 同时支持 Web 和多个小游戏平台。
- 正式 UI 可以使用引擎内 UI，不依赖 DOM。
- 对 2D/2.5D 足够友好，也保留 3D/第一人称演进可能。
- 项目代码可以保持 TypeScript 技术栈。

不建议把正式客户端继续深度绑定 React + Phaser。

React 可以保留，但只作为网页调试面板。

## 3. 前端分层

```text
client/
├── core/          # 平台无关、引擎无关
├── cocos/         # Cocos 渲染与正式 UI
├── web-shell/     # 网页 Demo 壳与调试面板
└── tools/         # 资源检查、动画能力导出等
```

### core 层

核心逻辑层。不能依赖：

```text
Cocos
React
DOM
window
wx
tt
```

职责：

- 保存当前世界视图状态。
- 应用 snapshot/delta。
- 管理网络抽象。
- 管理平台抽象。
- 解析动作表现。
- 输出 UI ViewModel。

### cocos 层

具体渲染实现：

- 地图渲染。
- 角色渲染。
- 动态对象渲染。
- 正式游戏 UI。
- 头顶图标。
- 2D 动画。
- 平台适配实现。

### web-shell 层

只用于网页 Demo：

- 嵌入 Cocos Web 构建。
- 显示 React DebugPanel。
- 查看 NPC 状态、事件、网络连接。

微信/抖音版本不包含 web-shell。

## 4. 平台适配层

定义接口：

```ts
export interface PlatformAdapter {
  name: 'web' | 'wechat' | 'douyin';

  getScreenSize(): { width: number; height: number };

  request(options: HttpRequest): Promise<HttpResponse>;

  connectSocket(url: string): GameSocket;

  loadAsset(url: string): Promise<ArrayBuffer>;

  saveLocal(key: string, value: string): void;

  readLocal(key: string): string | null;

  showToast(message: string): void;
}
```

实现：

```text
WebPlatformAdapter
WechatPlatformAdapter
DouyinPlatformAdapter
```

## 5. 网络层

不要在业务代码里直接调用 `WebSocket`、`wx.connectSocket` 或 `tt.connectSocket`。

统一使用：

```ts
export interface NetworkPort {
  connect(worldId: string): Promise<void>;
  disconnect(): void;
  send(message: ClientMessage): void;
  onMessage(handler: (message: ServerMessage) => void): void;
  onStatus(handler: (status: NetworkStatus) => void): void;
}
```

底层由平台适配实现。

## 6. 渲染接口

当前是 2D 小镇，但不要让业务逻辑绑定 2D。

```ts
export interface WorldRenderer {
  init(snapshot: WorldSnapshot): void;
  applySnapshot(snapshot: WorldSnapshot): void;
  applyDelta(delta: WorldDelta): void;
  showAction(characterId: string, action: ActionPresentation): void;
  showStatusIcon(characterId: string, iconCode: string): void;
  focusOn(targetId: string): void;
  destroy(): void;
}
```

当前实现：

```text
CocosTown2DRenderer
```

远期可以新增：

```text
CocosFirstPersonRenderer
```

同一个后端世界，同一个协议，不同客户端视角。

## 7. UI 架构

正式 UI 用 Cocos 内 UI，不用 React DOM。

正式 UI 包括：

- 人物面板。
- 物品面板。
- 金钱/资源显示。
- 村中记事。
- 工作/岗位面板。
- 地图对象信息。
- 对话气泡。
- 头顶状态图标。

调试 UI 可用 React，但仅 Web Demo 可见：

- WebSocket 状态。
- 世界 JSON。
- NPC 当前任务。
- AgentOperation 状态。
- 事件日志。

## 8. 动画能力降级

角色模型不一定有所有动作动画。表现逻辑必须支持降级。

```text
优先级 1：播放完整动画
优先级 2：播放通用动画 + 头顶图标
优先级 3：只显示头顶图标
```

例子：钓鱼。

```text
有 fish_cast 动画：坐下、甩竿、等待、收竿。
没有 fish_cast 动画：坐下或 idle，头顶显示 🎣。
没有 sit 动画：站立 idle，头顶显示 🎣。
```

## 9. 资源管理

资源不能散落在代码里。所有资源都要进 manifest。

```json
{
  "assetKey": "flower_pot_01",
  "type": "sprite",
  "path": "sprites/objects/decor/flower_pot_01.png",
  "tags": ["decor", "flower", "jiangnan"]
}
```

动画能力也要显式登记：

```json
{
  "modelType": "villager_male_a",
  "animationCode": "fish_cast",
  "exists": false,
  "fallbackAnimation": "idle",
  "fallbackIcon": "fishing"
}
```

## 10. 2D 到第一人称的预留

对象数据不要只存 2D 坐标，应使用 Transform：

```ts
export type Transform = {
  x: number;
  y: number;
  z?: number;
  rotation?: number;
  scale?: number;
};
```

对象模板预留：

```ts
export type ObjectTemplate = {
  id: string;
  asset2d: string;
  asset3d?: string;
  footprint: { w: number; h: number };
  height?: number;
  collision: CollisionShape;
  interactionPoints: InteractionPoint[];
};
```

第一阶段只用 2D 字段，远期再使用 3D 字段。

## 11. 前端第一阶段实现顺序

```text
1. Cocos Web 空场景启动
2. PlatformAdapter + NetworkPort 空实现
3. WorldStateStore
4. 加载静态地图
5. 渲染角色
6. 拉取 /api/worlds/default/snapshot
7. WebSocket 接收 world_delta
8. 渲染动态对象
9. 头顶图标系统
10. 正式 UI 基础面板
11. React DebugPanel 可选
12. 微信小游戏构建验证
13. 抖音小游戏构建验证
```

## 12. 禁止事项

```text
禁止在正式 UI 中使用 DOM
禁止业务代码直接调用 window/document
禁止业务代码直接调用 wx/tt
禁止把 WebSocket 写死在场景脚本里
禁止把动作动画写死在角色组件里
禁止让前端决定世界规则
```
