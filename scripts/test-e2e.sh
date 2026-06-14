#!/bin/bash
# 端到端测试 — 验证 NPC 自主生活循环

set -e

echo "=== 镜中边城端到端测试 ==="

# 1. 启动服务器
echo "1. 启动服务器..."
cd server
pnpm build
node dist/index.js &
SERVER_PID=$!
sleep 2

# 2. 检查 health endpoint
echo "2. 检查 health endpoint..."
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "   ✅ Health check passed"
else
  echo "   ❌ Health check failed"
  kill $SERVER_PID
  exit 1
fi

# 3. 检查 status endpoint
echo "3. 检查 status endpoint..."
STATUS=$(curl -s http://localhost:3000/status)
echo "   Status: $STATUS"

# 4. 等待世界运行几个 tick
echo "4. 等待世界运行 10 秒..."
sleep 10

# 5. 获取 snapshot
echo "5. 获取 world snapshot..."
SNAPSHOT=$(curl -s http://localhost:3000/snapshot)
NPC_COUNT=$(echo "$SNAPSHOT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.npcs?.length||0)")
echo "   NPC count: $NPC_COUNT"

if [ "$NPC_COUNT" -ge 5 ]; then
  echo "   ✅ NPC count check passed"
else
  echo "   ❌ NPC count check failed (expected >= 5, got $NPC_COUNT)"
  kill $SERVER_PID
  exit 1
fi

# 6. 检查 NPC 状态
echo "6. 检查 NPC 状态..."
echo "$SNAPSHOT" | node -e "
  const d=require('fs').readFileSync('/dev/stdin','utf8');
  const j=JSON.parse(d);
  j.npcs?.forEach(n => {
    console.log('   -', n.displayName, ':', n.status, n.currentAction||'');
  });
"

# 7. 停止服务器
echo "7. 停止服务器..."
kill $SERVER_PID

echo ""
echo "=== 测试完成 ==="
