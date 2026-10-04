#!/usr/bin/env bash
#
# scripts/deploy.sh — AiToEarn 一键部署脚本（内网版）
#
# 用法:
#   ./scripts/deploy.sh                  # 全量构建 + 启动
#   ./scripts/deploy.sh --skip-build     # 跳过构建，仅同步配置 + 启动
#   ./scripts/deploy.sh --clean-data     # 删除 MongoDB/Redis 数据卷重新初始化
#   ./scripts/deploy.sh --reset-image    # 删除旧 aitoearn-local/* 镜像后重建
#
# 前置条件:
#   1. 已 cp .env.example .env 并填入 JWT_SECRET / INTERNAL_TOKEN
#   2. docker compose >= 2.x 已安装
#   3. 当前目录是项目根（包含 docker-compose.yml）
#

set -euo pipefail

# === 路径与常量 ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BACKEND_DIR="$PROJECT_ROOT/project/aitoearn-backend"
WEB_DIR="$PROJECT_ROOT/project/aitoearn-web"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
COMPOSE_LOCAL="$PROJECT_ROOT/docker-compose.local.yml"
ENV_FILE="$PROJECT_ROOT/.env"

SERVER_CONFIG="$BACKEND_DIR/apps/aitoearn-server/config/config.yaml"
AI_CONFIG="$BACKEND_DIR/apps/aitoearn-ai/config/config.yaml"

export COMPOSE_FILE
export COMPOSE_FILE_OVERRIDE="$COMPOSE_LOCAL"

# 探测宿主架构（arm64 / amd64）
HOST_ARCH="$(uname -m)"
case "$HOST_ARCH" in
  x86_64)  DOCKER_PLATFORM="linux/amd64" ;;
  aarch64|arm64) DOCKER_PLATFORM="linux/arm64" ;;
  *) DOCKER_PLATFORM="linux/amd64" ;;
esac

# 探测首选基础镜像（默认 alpine，可通过 .env 覆盖）
BASE_IMAGE="${BASE_IMAGE:-alpine}"
if grep -q '^BASE_IMAGE=' "$ENV_FILE" 2>/dev/null; then
  BASE_IMAGE="$(grep '^BASE_IMAGE=' "$ENV_FILE" | head -1 | cut -d= -f2 | tr -d '"' | tr -d "'")"
fi
export BASE_IMAGE
log "宿主架构: $HOST_ARCH  →  Docker platform: $DOCKER_PLATFORM"
log "Docker 基础镜像: $BASE_IMAGE  (alpine / debian / ubuntu)"

# === 颜色输出 ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
err()   { echo -e "${RED}✗${NC} $*" >&2; }
die()   { err "$*"; exit 1; }

# === 参数解析 ===
SKIP_BUILD=false
CLEAN_DATA=false
RESET_IMAGE=false
for arg in "$@"; do
  case "$arg" in
    --skip-build)  SKIP_BUILD=true ;;
    --clean-data)  CLEAN_DATA=true ;;
    --reset-image) RESET_IMAGE=true ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) die "未知参数: $arg" ;;
  esac
done

# === 前置校验 ===
command -v docker >/dev/null 2>&1 || die "docker 未安装"
docker compose version >/dev/null 2>&1 || die "docker compose plugin 未安装"

[ -f "$ENV_FILE" ] || die ".env 文件不存在，请先: cp .env.example .env"
[ -f "$COMPOSE_FILE" ] || die "docker-compose.yml 不存在"
[ -f "$COMPOSE_LOCAL" ] || die "docker-compose.local.yml 不存在（fork 仓库请确保存在）"

# 加载 env
set -a
source "$ENV_FILE"
set +a

# 必填校验
: "${JWT_SECRET:?JWT_SECRET 未设置，请编辑 .env}"
: "${INTERNAL_TOKEN:?INTERNAL_TOKEN 未设置，请编辑 .env}"

[ ${#JWT_SECRET} -ge 32 ] || die "JWT_SECRET 至少 32 字符（当前 ${#JWT_SECRET}）"

ok "环境变量加载完成"

# === 从 docker-compose.yml 提取密码（单一来源原则）===
MONGO_PASSWORD=$(grep "MONGO_INITDB_ROOT_PASSWORD:" "$COMPOSE_FILE" | head -1 | awk '{print $2}')
REDIS_PASSWORD=$(grep -E "requirepass" "$COMPOSE_FILE" | head -1 | sed -E 's/.*requirepass[[:space:]]+([^[:space:]]+).*/\1/')

[ -n "$MONGO_PASSWORD" ] || die "无法从 docker-compose.yml 提取 MONGO_INITDB_ROOT_PASSWORD"
[ -n "$REDIS_PASSWORD" ] || die "无法从 docker-compose.yml 提取 redis requirepass"

log "Mongo 密码: $MONGO_PASSWORD"
log "Redis 密码: $REDIS_PASSWORD"

# === 同步配置到 config.yaml（避免密码不一致）===
sync_config_passwords() {
  local file="$1"
  [ -f "$file" ] || return

  # MongoDB URI
  sed -i.bak "s|mongodb://admin:[^@]*@mongodb|mongodb://admin:${MONGO_PASSWORD}@mongodb|g" "$file"
  # Redis 密码
  sed -i.bak "s|^  password: \".*\"|  password: \"${REDIS_PASSWORD}\"|g" "$file"
  sed -i.bak "s|    password: \".*\"|    password: \"${REDIS_PASSWORD}\"|g" "$file"
  # JWT secret / token
  sed -i.bak "s|^  secret: \".*\"|  secret: \"${JWT_SECRET}\"|g" "$file"
  sed -i.bak "s|^  internalToken: \".*\"|  internalToken: \"${INTERNAL_TOKEN}\"|g" "$file"
  sed -i.bak "s|^  token: \".*\"|  token: \"${INTERNAL_TOKEN}\"|g" "$file"
  rm -f "$file.bak"
}

sync_config_passwords "$SERVER_CONFIG"
sync_config_passwords "$AI_CONFIG"
ok "config.yaml 已同步密码"

# === 数据卷清理 ===
if $CLEAN_DATA; then
  log "删除 MongoDB / Redis 数据卷..."
  docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_LOCAL" down -v 2>/dev/null || true
  docker volume rm aitoearn_mongodb-data aitoearn_mongodb-config aitoearn_redis-data 2>/dev/null || true
  ok "数据卷已清理（密码账号将丢失）"
fi

# === 镜像清理 ===
if $RESET_IMAGE; then
  log "删除旧 aitoearn-local/* 镜像..."
  docker images --format '{{.Repository}}:{{.Tag}}' | grep '^aitoearn-local/' | xargs -r docker rmi -f 2>/dev/null || true
  ok "旧镜像已清理"
fi

# === 构建 ===
if ! $SKIP_BUILD; then
  log "安装后端依赖（可能需要几分钟）..."
  (cd "$BACKEND_DIR" && pnpm install --frozen-lockfile=false 2>&1 | tail -5)

  log "构建 aitoearn-server 镜像（$DOCKER_PLATFORM，base=$BASE_IMAGE）..."
  (cd "$BACKEND_DIR" && node scripts/build-docker.mjs aitoearn-server --platform "$DOCKER_PLATFORM" 2>&1 | tail -3)
  docker tag "aitoearn-server:$(date +%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo latest)" \
             "aitoearn-local/aitoearn-server:latest"
  ok "aitoearn-server 镜像构建完成"

  log "构建 aitoearn-ai 镜像（$DOCKER_PLATFORM，base=$BASE_IMAGE）..."
  (cd "$BACKEND_DIR" && node scripts/build-docker.mjs aitoearn-ai --platform "$DOCKER_PLATFORM" 2>&1 | tail -3)
  docker tag "aitoearn-ai:$(date +%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo latest)" \
             "aitoearn-local/aitoearn-ai:latest"
  ok "aitoearn-ai 镜像构建完成"

  log "构建 aitoearn-web 镜像（base=$BASE_IMAGE）..."
  (cd "$WEB_DIR" && pnpm install --frozen-lockfile=false 2>&1 | tail -3)
  docker build -t "aitoearn-local/aitoearn-web:latest" --build-arg BASE_IMAGE="$BASE_IMAGE" -f "$WEB_DIR/Dockerfile" "$WEB_DIR" 2>&1 | tail -3
  ok "aitoearn-web 镜像构建完成"
fi

# === 启动 ===
log "启动所有服务..."
docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_LOCAL" up -d

log "等待健康检查（最长 120 秒）..."
ATTEMPTS=0
MAX_ATTEMPTS=24
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_LOCAL" ps 2>/dev/null \
    | grep -E "aitoearn-(ai|server|web|nginx|mongodb|redis|rustfs)" \
    | grep -vE "\(healthy\)|\(starting\)" | wc -l | tr -d ' ')
  if [ "$UNHEALTHY" = "0" ]; then
    ok "所有服务健康"
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  log "等待中... ($ATTEMPTS/$MAX_ATTEMPTS)"
  sleep 5
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  warn "部分服务未通过健康检查，请查看下方状态"
fi

# === 状态总览 ===
echo ""
echo "==================== 容器状态 ===================="
docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_LOCAL" ps
echo "================================================"
echo ""

# === 快速验证 ===
log "测试后端健康端点..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  ok "健康检查通过（HTTP 200）"
else
  warn "健康检查返回 HTTP $HEALTH"
fi

# === 后续指引 ===
cat <<EOF

${GREEN}部署完成${NC}

下一步：
  1. 浏览器访问: ${BLUE}http://localhost:8080/zh-CN/auth/login${NC}
  2. 应该看到 4 个 Tab（邮箱 / 手机 / 账号 / 注册）
  3. 在「注册」Tab 创建第一个账号（密码 8+ 位含字母和数字）

基础镜像切换：
  - 当前构建: $BASE_IMAGE
  - 切到 Debian: 在 .env 顶部加 BASE_IMAGE=debian 然后重跑脚本
  - 切到 Ubuntu: 在 .env 顶部加 BASE_IMAGE=ubuntu 然后重跑脚本

常用命令：
  - 查看日志:    docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f aitoearn-server
  - 重启服务:    docker compose -f docker-compose.yml -f docker-compose.local.yml restart aitoearn-server
  - 测试密码登录: curl -X POST http://localhost:8080/api/auth/register/account \\
                    -H "Content-Type: application/json" -d '{"account":"alice","password":"Alice@2026"}'
EOF
