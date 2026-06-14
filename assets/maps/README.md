# 镜中边城地图资产规范

`assets/maps/` 是项目唯一的可编辑地图仓库。Web 客户端通过
`assets/maps/manifest.json` 查找当前启用的地图。

## 标准目录

```text
assets/maps/
  manifest.json
  <map_id>/
    source/       # Tiled 主文件（.tmj/.tmx），地图编辑的唯一真源
    tilesets/     # 图块集定义与图片
    compiled/     # 客户端/服务端读取的语义 JSON
    preview/      # Web 外壳和人工检查使用的预览图
    docs/         # 该地图独有的说明
```

当前地图：

- 地图 ID：`jiangnan_village_v0_1`
- Tiled 源文件：`source/jiangnan_village_v0_1.tmj`
- 运行时入口：`compiled/world_seed.json`
- 完整预览：`preview/map_preview.png`
- 隐藏屋顶预览：`preview/roofs_hidden_preview.png`

## 修改地图

1. 用 Tiled 打开 `source/jiangnan_village_v0_1.tmj`。
2. 图块图片和 `.tsj` 始终放在同一地图包的 `tilesets/` 中，并保持相对路径有效。
3. 地形、道路、房屋外观在瓦片层中修改。
4. 碰撞、出生点、房屋点击区、屋顶组等规则在对应对象层中修改。
5. 保存源文件后，同步重新导出 `compiled/` 下受影响的 JSON 和 `preview/` 下的预览图。
6. 在浏览器中检查地图尺寸、人物坐标、房屋点击区和屋顶切换。

`source/` 是真源。不要把直接修改 `compiled/` 当作长期工作流；后续地图编译器会覆盖这些文件。当前地图包已附带可用的编译结果，因此可以直接运行。

## 新增地图

复制标准目录结构，使用新的稳定 `map_id`，然后在
`assets/maps/manifest.json` 的 `maps` 中登记。需要切换默认地图时，只修改
`activeMapId`。

地图 ID、房屋 ID、区域 ID 一旦进入存档或后端数据就不要重命名。大规模布局或语义变化应建立新版本目录，例如
`jiangnan_village_v0_2`；纯贴图修正可以保留原 ID。

`content/maps/` 只用于服务端目录或运行时引用，不存放 Tiled 源文件和贴图。

修改语义对象层前，请同时阅读
`jiangnan_village_v0_1/docs/map_editing_guide.md` 和
`jiangnan_village_v0_1/docs/roof_toggle_spec.md`。
