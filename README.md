# 镜中边城 (mirror-town)

AI 驱动的常驻江南小镇模拟器。

## WorldX 资源接入 (2.5D Demo)

当前第一版网页 Demo 使用了来自 WorldX 的 2.5D 地图与角色资源。

### 资源来源
* **WorldX**: [https://github.com/YGYOOO/WorldX](https://github.com/YGYOOO/WorldX)
* **Imported World**: `library/worlds/world_2026-04-19T08-31-24`
* **License**: MIT

### 导入步骤
1. 确保 `assets/vendor/worldx/world_2026-04-19T08-31-24/` 目录下已拉取原始资源。
2. 运行导入工具：
   ```bash
   cd tools/worldx-importer
   pnpm install
   pnpm run import
   ```
   这会生成 `content/maps/worldx_bianjing_night_market_v0/`。

### 运行步骤
1. 启动后端：
   ```bash
   cd server
   pnpm dev
   ```
   后端会默认加载 `content/maps/worldx_bianjing_night_market_v0/world_seed.json`。
2. 启动前端：
   ```bash
   cd client/web-shell
   pnpm dev
   ```
3. 访问 [http://localhost:5173](http://localhost:5173) 即可看到 2.5D 地图 Demo。

### 当前限制
1. **地图风格**：当前地图是 WorldX 的汴京夜市，作为技术占位，非最终三国江南风格。
2. **屋顶隐藏**：暂不支持，因为当前地图是单层 2.5D 背景图。
3. **人物动画**：当前仅显示 spritesheet 静态帧或整图缩放，尚未接入精细动画切片。
4. **交互性**：当前仅作为观察器，不支持多人联机操作。

### 后续工作
1. 接入正式的三国江南小村落 2.5D 资源（分层渲染）。
2. 校准并接入人物动画状态机。
3. 完善 nav_grid 寻路逻辑。
