# 12. 部署与运维计划

## 1. 第一阶段部署目标

先部署网页 Demo，让很多人能同时打开观看小镇。

核心要求：

```text
前端静态资源稳定访问
后端 WorldRuntime 常驻运行
WebSocket 稳定连接
多人浏览不增加模拟成本
LLM/Embedding 异常不拖死世界
```

## 2. 推荐部署结构

```text
Nginx
├── /                 → Cocos Web 静态资源
├── /assets           → 远程资源/贴图/音频
├── /api              → jingzhong-biancheng-server HTTP
└── /ws               → jingzhong-biancheng-server WebSocket

jingzhong-biancheng-server
├── HTTP API
├── WS ViewerHub
├── WorldRuntime
├── SnapshotService
└── AgentScheduler

agent-worker
├── LLM 调用
├── 反思/日记
└── 记忆总结

MySQL
Redis
Embedding Service 可选
```

## 3. 你现有资源下的建议

如果使用阿里云 ECS + MySQL + Redis，腾讯云跑 Qwen Embedding：

```text
阿里云 ECS：jingzhong-biancheng-server / agent-worker / nginx
阿里云 MySQL：事务数据、事件、任务、记忆、金钱流水
阿里云 Redis：锁、队列、热状态、viewer 统计
腾讯云：embedding-service
```

注意：主 Tick 不要跨云调用 Embedding。Embedding 只在 AgentWorker/MemoryWorker 中异步调用。

## 4. Docker Compose 草案

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - ./public:/usr/share/nginx/html
    depends_on:
      - jingzhong-biancheng-server

  jingzhong-biancheng-server:
    image: jingzhong-biancheng-server:latest
    env_file: .env
    ports:
      - '3000:3000'
    depends_on:
      - redis
      - mysql

  agent-worker:
    image: jingzhong-biancheng-server:latest
    command: ['node', 'dist/worker/agent-worker.js']
    env_file: .env
    depends_on:
      - redis
      - mysql

  redis:
    image: redis:7

  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: jingzhong_biancheng
      MYSQL_ROOT_PASSWORD: example
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## 5. 环境变量

```env
NODE_ENV=production
PORT=3000

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=jingzhong_biancheng
MYSQL_USER=jingzhong_biancheng
MYSQL_PASSWORD=change_me

REDIS_URL=redis://127.0.0.1:6379

WORLD_ID=default
WORLD_TICK_RATE_ONLINE=5
WORLD_TICK_RATE_OFFLINE=1

LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://example.com/v1
LLM_API_KEY=change_me
LLM_MODEL=example-model

EMBEDDING_BASE_URL=http://embedding-service:8000
EMBEDDING_MODEL=Qwen3-Embedding-0.6B
```

注意：小游戏前端包里绝对不能放 LLM API Key、AppSecret、数据库密码。

## 6. 静态资源

网页 Demo：

```text
Nginx 直接托管 Cocos Web build
```

微信/抖音：

```text
小包体 + 远程资源
资源加版本 hash
按区域/角色/对象分包
```

## 7. WebSocket 运维

需要：

```text
心跳 ping/pong
连接数统计
慢客户端踢出
Nginx 反代 ws/wss
日志记录连接/断开
```

Nginx 反代示例：

```nginx
location /ws/ {
  proxy_pass http://jingzhong-biancheng-server:3000/ws/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

## 8. 监控指标

第一版至少记录：

```text
viewer_count
world_tick_duration_ms
world_tick_lag_ms
ws_connected_clients
ws_broadcast_bytes_per_sec
agent_operations_pending
agent_operations_failed
llm_latency_ms
llm_error_rate
mysql_write_error_count
redis_error_count
```

## 9. 熔断规则

```text
LLM 连续失败 → 暂停 LLM，只跑行为树
Embedding 失败 → 使用关键词检索 fallback
数据库写入失败 → 进入 MAINTENANCE
Tick 超时严重 → 降低 simulation mode
WS 积压严重 → 踢慢客户端
```

## 10. 备份

至少备份：

```text
worlds
world_snapshots
characters
world_objects
memories
relationships
money_transactions
world_events
```

第一版每天备份一次即可。

## 11. 发布顺序

```text
1. 本地 docker-compose dev 跑通
2. ECS 部署 jingzhong-biancheng-server + nginx
3. MySQL/Redis 连接测试
4. 前端 Web build 上传
5. snapshot API 测试
6. WebSocket 测试
7. 5 个 NPC 跑 1 小时
8. 20 个浏览器同时打开测试
9. LLM 关闭测试 fallback
10. 正式开放 Demo
```
