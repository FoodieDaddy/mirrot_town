# 部署

部署目标是由一份权威 `WorldRuntime` 服务所有 Viewer：

- Nginx 托管 Web 静态资源并代理 HTTP/WebSocket。
- Server 常驻推进唯一世界。
- MySQL、Redis 和 Worker 在后续 Sprint 接入。

Sprint 0/1 的本地运行不依赖容器。
