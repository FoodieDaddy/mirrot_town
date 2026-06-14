# Map Compiler 说明 v0.1

当前 `compiled/*.json` 是随地图包预生成的。下一步应写真正的 Map Compiler：

```text
Tiled .tmj
  -> validate ids
  -> extract regions
  -> extract interaction points
  -> extract placement slots
  -> extract house click areas / roof groups
  -> generate collision
  -> generate nav_grid
  -> write world_seed.json
```

## 必检项

- 所有 region id 唯一。
- 所有 interaction point 必须位于可达区域附近。
- 所有 placement slot 不应与 collision 重叠。
- 所有 house region 如果有屋顶，必须有 roof_group。
- 所有 roof_group 必须有 house_click_area。
- 所有 crop_slot 必须位于 farm region。
