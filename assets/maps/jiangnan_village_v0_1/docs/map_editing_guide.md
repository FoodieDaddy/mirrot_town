# 地图编辑指南 v0.1

## 编辑器

推荐使用 Tiled 打开：

```text
assets/maps/jiangnan_village_v0_1/source/jiangnan_village_v0_1.tmj
```

## 图层说明

### 视觉层

- `Ground`：基础草地。
- `Ground_Detail`：草丛、石子、杂物感。
- `Water`：河流与水体。
- `Canal`：农田水渠。
- `Road`：土路、广场。
- `Farm`：稻田、菜地。
- `Building_Base`：墙体、门窗。
- `Interior_Floor`：室内地面。
- `Object_Back`：床、箱子、桌子等后层对象。
- `Object_Front`：篱笆、花草、桶、工作物件等前景对象。
- `Roof`：完整屋顶。
- `Roof_Open`：切顶屋顶，默认隐藏。
- `Canopy_Overlay`：树冠、竹林遮挡。
- `Shadow`：阴影。
- `Light`：灯、窗光、火光占位。

### 语义层

- `Regions`：区域，后端和 AI 使用。
- `Interaction_Points`：交互点。
- `Placement_Slots`：AI 放置槽位。
- `House_Click_Areas`：房屋点击区域。
- `Roof_Groups`：屋顶组。
- `Collision`：碰撞区。
- `Spawn_Points`：出生点。

## 修改原则

1. 视觉层可以逐步替换为正式美术。
2. `Regions / Interaction_Points / Placement_Slots` 不要随便删，它们是 AI 和后端识别世界的关键。
3. 新增房屋时，必须同时新增：
   - Region
   - House_Click_Area
   - Roof_Group
   - Roof tile
   - Interior floor
4. 新增可交互对象时，需要同步补：
   - object_template
   - interaction_point
   - placement_slot（如果允许 AI 放置）
