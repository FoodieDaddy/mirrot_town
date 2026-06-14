# 15. 房屋屋顶显示规则 v1

## 1. 系统边界

屋顶显示属于 Viewer 本地表现状态：

- 不写入后端世界状态。
- 不进入 Snapshot、Delta 或 WebSocket 协议。
- 不影响其他浏览者。
- 不参与 NPC 感知、寻路、动作和 AI 决策。
- AI 或 NPC 进入房屋时，不自动隐藏屋顶。

## 2. 默认状态

所有房屋默认显示完整屋顶。

```ts
type RoofVisibilityMode = "NORMAL" | "ALL_HIDDEN";

type HouseRoofState = {
  mode: RoofVisibilityMode;
  hiddenHouseIds: Set<string>;
};
```

## 3. 单栋房屋

在 `NORMAL` 模式下：

```text
点击房屋 A → 隐藏房屋 A 的屋顶
再次点击房屋 A → 恢复房屋 A 的屋顶
```

每栋房屋必须有稳定 `houseId`。单栋状态只记录在当前客户端的
`hiddenHouseIds` 中。

## 4. 全局控制

UI 提供两个清晰按钮：

```text
全部隐藏屋顶
全部显示屋顶
```

规则：

- 点击“全部隐藏屋顶”后进入 `ALL_HIDDEN`，所有屋顶隐藏。
- `ALL_HIDDEN` 模式下，单栋房屋点击不改变状态。
- 点击“全部显示屋顶”后回到 `NORMAL`，清空 `hiddenHouseIds`，恢复所有屋顶。

## 5. 第一版验收

```text
默认屋顶全部显示
单栋房屋可反复切换
全局隐藏时所有屋顶隐藏
全局隐藏时单栋点击无效
全局显示后所有屋顶恢复
世界实时更新不会重置当前 Viewer 的屋顶状态
后端协议和世界状态中没有屋顶显示字段
```
