# Cocos 正式客户端

此目录预留给镜中边城的 Cocos Creator 3.x 正式客户端。

约束：

- 世界状态只通过 `@jingzhong-biancheng/client-core` 读取和更新。
- 场景脚本不得直接决定世界规则。
- 正式 UI 使用 Cocos UI，不依赖 DOM。
- Web、微信和抖音能力通过平台适配器接入。

首个 Cocos 工程需要在 Cocos Creator 编辑器中创建，以避免提交不完整或版本不匹配的工程元数据。当前可运行的浏览验证由 `client/web-shell` 提供。
