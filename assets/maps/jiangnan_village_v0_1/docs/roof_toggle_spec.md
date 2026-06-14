# 房屋屋顶隐藏规则 v0.1

## 定案

- 默认屋顶显示。
- 点击房子隐藏该房屋屋顶。
- 再次点击恢复该房屋屋顶。
- UI 提供“全部隐藏屋顶”和“全部显示屋顶”。
- AI 进屋不自动隐藏屋顶。
- 屋顶显示状态只在客户端保存。

## Tiled 层

- `Roof`：完整屋顶层，默认可见。
- `Roof_Open`：切顶边缘层，默认不可见，可选。
- `House_Click_Areas`：房屋点击区域。
- `Roof_Groups`：屋顶组数据。

## 前端推荐实现

```ts
const hiddenHouseIds = new Set<string>();
let allRoofsHidden = false;

function onHouseClicked(houseId: string) {
  if (hiddenHouseIds.has(houseId)) {
    hiddenHouseIds.delete(houseId);
    showRoof(houseId);
  } else {
    hiddenHouseIds.add(houseId);
    hideRoof(houseId);
  }
}

function hideAllRoofs() {
  allRoofsHidden = true;
  for (const group of roofGroups) hideRoof(group.house_id);
}

function showAllRoofs() {
  allRoofsHidden = false;
  hiddenHouseIds.clear();
  for (const group of roofGroups) showRoof(group.house_id);
}
```

## 后端注意

后端不需要保存屋顶状态。后端只提供房屋、角色、对象、区域等真实世界状态。
