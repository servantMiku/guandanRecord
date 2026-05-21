# CLAUDE.md

本项目指南，供 Claude Code 使用。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时启动 H5 前端（5000 端口）和 NestJS 后端（3000 端口） |
| `pnpm dev:web` | 仅启动 H5 前端 |
| `pnpm dev:weapp` | 仅启动微信小程序 |
| `pnpm dev:server` | 仅启动后端（热重载） |
| `pnpm build` | 构建全部（H5 + 小程序 + 后端） |
| `pnpm build:web` | 构建 H5 到 `dist-web/` |
| `pnpm build:weapp` | 构建小程序到 `dist/` |
| `pnpm build:server` | 构建后端到 `server/dist/` |
| `pnpm tsc` | 前端 TS 类型检查（`--noEmit --skipLibCheck`） |
| `pnpm lint` | 前端 ESLint |
| `cd server && npx tsc --noEmit --skipLibCheck` | 后端 TS 类型检查 |

## 项目架构

**掼蛋战绩记录器** — Taro 4 + React 18 跨端小程序，NestJS 后端。

### 数据库（Supabase PostgreSQL）

8 张表，通过 Supabase JS 客户端操作（Drizzle schema 仅作参考，不用于查询）。

建表 SQL 见 `db/init.sql`，适用于新环境初始化。**后续所有表结构变更**在 `db/` 目录下新增版本化 SQL 文件（如 `v1.1.sql`），保留变更记录，不修改 `init.sql`。

- **health_check** — 健康检查
- **seasons** — 赛季，含总局数限制 `total_matches` 和当前局数 `current_matches`
- **players** — 玩家（最多 6 人），支持改名
- **matches** — 对局记录，4 人组队，软删除，`edit_history` JSONB 字段记录编辑历史
- **player_stats** — 按赛季预计算的聚合数据（总局数、胜场、胜率、删除标记）
- **app_config** — KV 配置存储（如 `honor_threshold`、`threshold_calc_method`）
- **users** — 微信用户认证（openid、角色 `user` | `admin`）
- **operation_logs** — 操作审计日志（user_id、action、target_type、target_id、details JSONB）

### 后端（NestJS）

模块位于 `server/src/`：**players**、**seasons**、**matches**、**stats**、**config**、**init**、**auth**

所有 controller 直接使用 `getSupabaseClient()`，无 service 层。统一响应格式：`{ code, msg, data }`。

关键接口：
- `GET /api/stats/season?seasonId=X` — 赛季完整统计（奖项、排名、搭档矩阵、连胜记录）
- `GET/POST /api/config` — 读写配置
- `GET /api/stats/export` / `POST /api/stats/import` — 全量备份/恢复

### 前端（Taro + React）

8 个页面，分布在 5 个 tab（首页、统计、战绩、赛季、我的）。

- **API 调用**：统一使用 `import { Network } from '@/network'`，它封装了 `Taro.request` 并自动拼接 `PROJECT_DOMAIN`。禁止直接调用 `Taro.request`。
- **样式**：优先使用 Tailwind CSS 4，CSS 文件仅用于渐变、复杂动画等 Tailwind 无法表达的场景。每个页面有独立的 `index.css`。

### 页面一览

| 页面 | 功能 |
|------|------|
| `pages/index/index` | 首页 — 当前赛季、最近对局、快捷操作 |
| `pages/stats/index` | 统计 — 排名表、荣誉墙、搭档矩阵 |
| `pages/records/index` | 战绩列表 |
| `pages/record-detail/index` | 对局详情 |
| `pages/record-form/index` | 录入/编辑对局 |
| `pages/seasons/index` | 赛季管理（增删改） |
| `pages/arrange/index` | 排阵（配对） |
| `pages/profile/index` | 设置 — 玩家管理、数据备份、荣誉门槛配置 |

### 关键模式

- **荣誉门槛**：存储在 `app_config` 的 `honor_threshold` 键（50-100%）。同时影响后端 `calculateAwards` 的奖项计算和前端的排行过滤。计算方式通过 `threshold_calc_method` 配置：`season_total`（默认，基于赛季总参与次数）或 `avg_participation`（基于平均参与率）。
- **赛季统计**：从原始 `matches` 表和预聚合 `player_stats` 表计算。支持单赛季和 GOAT（全历史）两种模式。
- **数据备份/恢复**：全表 JSON 导出导入。小程序端使用剪贴板，H5 端使用文件下载/上传。
- **玩家头像**：`players.avatar` 字段存 base64。`PlayerAvatar` 组件渲染头像图片或姓名首字母兜底。管理员在设置页通过 `Taro.chooseImage` → base64 → `PUT /api/players/:id` 上传。

## 认证系统

JWT + Passport 方案。微信小程序 `Taro.login()` 获取 code → 后端调微信 API 换取 openid → 签发 JWT。通过 RolesGuard + `@Roles('admin')` 装饰器控制接口权限。

### 后端认证模块（`server/src/auth/`）

| 文件 | 用途 |
|------|------|
| `auth.controller.ts` | `POST /api/auth/login`（微信 code 登录）、`POST /api/auth/login/password`（H5 备用）、`GET /api/auth/me`（当前用户） |
| `auth.service.ts` | 微信 code→openid 换取 JWT、H5 密码登录、获取用户信息 |
| `strategies/jwt.strategy.ts` | Passport JWT 策略 — 从 `Authorization: Bearer <token>` 提取 payload，查询 users 表验证 |
| `guards/roles.guard.ts` | 读取 `@Roles()` 元数据，检查 `user.role` 是否匹配 |
| `decorators/roles.decorator.ts` | `@Roles('admin')` |
| `decorators/current-user.decorator.ts` | `@CurrentUser()` 参数装饰器 |

登录流程：
```
Taro.login() → code → POST /api/auth/login { code }
  → 后端调微信 API（appid + secret + code）换取 openid
  → 创建或更新 users 表记录
  → 签发 JWT { userId, role, openid }（30 天有效期）
  → 返回 { token, user: { id, nickname, avatarUrl, role } }
```

### 权限矩阵

| 接口 | 权限 |
|------|------|
| `GET /api/players`、`GET /api/seasons/*`、`GET /api/config`、`GET /api/stats/season` | 公开 |
| `POST /api/matches`、`PUT/DELETE /api/matches/:id` | 公开 |
| `POST/PUT /api/players/*`、`POST /api/seasons/**`、`POST /api/matches/clear-all`、备份恢复接口、配置写入 | 仅 admin |

### 前端认证

- **Store**（`src/stores/authStore.ts`）：`loginWithWechat()`、`loginWithPassword(password)`、`logout()`、`initAuth()`、`getToken()`、`getStoredUser()`
- **网络层**：`src/network.ts` 自动从 `Taro.getStorageSync('auth_token')` 读取 token，注入 `Authorization: Bearer <token>` 请求头
- **启动流程**：`src/app.ts` 在 `useLaunch` 中调用 `initAuth()`，等待认证初始化完成再渲染页面
- **页面权限**：设置页显示用户信息，admin 可见玩家管理（含头像上传）、数据备份、门槛配置、清空数据。赛季页 admin 可见新建、编辑、结束按钮

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | `guandan-dev-secret-key` |
| `WECHAT_APPID` | 微信小程序 AppID | — |
| `WECHAT_APP_SECRET` | 微信小程序 AppSecret | — |
| `ADMIN_PASSWORD` | H5 备用密码 | `admin123` |

### 发布注意

`project.config.json` 中的 `appid` 需从 `touristappid` 改为真实 AppID，否则 `Taro.login()` 无法获取有效 code。H5 开发阶段可通过 `ADMIN_PASSWORD` 密码登录绕过。

## 测试

### H5 密码登录测试（curl）

```bash
# 登录获取 token
TOKEN=$(curl -s http://localhost:3000/api/auth/login/password \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 查询当前用户
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 带 token 调 admin 接口 → 200
curl -s -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"test-player"}' | python3 -m json.tool

# 不带 token 调 admin 接口 → 401
curl -s -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -d '{"name":"test-player"}' | python3 -m json.tool
```
