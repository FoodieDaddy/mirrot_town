# 镜中边城 (mirror-town)

AI 驱动的常驻江南小镇模拟器。

## 当前展示端：Three.js QTown (v0.1)

目前项目的主前端展示层是基于 Three.js 的 3D Q版小镇 (`client/renderer-three`)。我们采用正交斜俯视 2.5D 视角，不包含第一人称或自由 3D 视角。前端仅负责纯粹的展示与输入转发，不包含任何世界模拟逻辑。

### 核心资源文件

- **展示端目录**: `client/renderer-three`
- **当前地图配置**: `maps/qtown_v0_1.json`
- **运行资产清单**: `assets/manifest/asset-manifest.json` 和 `license-manifest.json`
- **GLB 运行资产**: 存放在 `assets/glb/` 目录下（开发服务器运行时会同步到 public 目录）

### 资产获取与导入

由于项目仅使用开源免费/CC0低模资产，我们需要通过管线脚本自动提取和验证素材：

> **注意：** 请先人工将下载的素材压缩包（如 `.zip`）解压到 `assets/source/` 对应的来源目录下（例如 `assets/source/kaykit/...`）。目前的 import 脚本不会自动解压 zip 文件。

1. **导入与转换素材**:

   ```bash
   pnpm import:qtown-assets
   ```

   这会从 `assets/source/` 中扫描符合条件的原始素材，执行 `.gltf` 到 `.glb` 的自动转换，并生成正式的运行素材至 `assets/glb/` 目录。

2. **验证素材**:

   ```bash
   pnpm validate:qtown-assets
   ```

   校验 Manifest 的合法性、GLB 二进制格式的正确性以及地图配置是否存在断链。

3. **同步运行时资源**:
   ```bash
   pnpm sync:qtown-runtime
   ```
   将所有合规的资源和清单复制到 `client/renderer-three/public/` 目录下供前端读取。

### 运行开发服务器

在完成上述资产导入管线后，启动后端模拟器与前端展示层：

```bash
pnpm dev:renderer-three
# (或者使用 pnpm dev 同时启动所有后台服务)
```

访问终端提示的本地端口（如 `http://localhost:5180`），即可观测 3D QTown 运行状态。

### 当前限制

1. 仅限使用指定来源的低模卡通资源。
2. 前端仅提供基础的渲染、点击选取建筑和控制屋顶隐藏功能。
3. 暂时不含深度的联机状态交互逻辑。
