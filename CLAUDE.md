# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start H5 frontend (port 5000) + NestJS backend (port 3000) concurrently |
| `pnpm dev:web` | H5 frontend only |
| `pnpm dev:weapp` | WeChat mini-program only |
| `pnpm dev:server` | Backend only (hot-reload) |
| `pnpm build` | Build all (H5 + weapp + server) |
| `pnpm build:web` | Build H5 to `dist-web/` |
| `pnpm build:weapp` | Build weapp to `dist/` |
| `pnpm build:server` | Build backend to `server/dist/` |
| `pnpm tsc` | TypeScript check frontend (`--noEmit --skipLibCheck`) |
| `pnpm lint` | ESLint frontend |
| `cd server && npx tsc --noEmit --skipLibCheck` | TypeScript check backend |

## Architecture

**掼蛋 (Guandan) score tracker** — a Taro 4 + React 18 cross-platform mini-program with NestJS backend.

### Database (Supabase PostgreSQL)

8 tables managed via Supabase JS client (not Drizzle for queries — Drizzle schema is for reference).

完整的建表 SQL 在 `db/init.sql`，适用于新环境一键初始化。**后续所有数据库表结构变更**，都在 `db/` 目录下新增版本化 SQL 文件（如 `v1.1.sql`），保留变更记录，不修改 `init.sql`。

- **health_check** — 健康检查（serial id）
- **seasons** — lifecycle with `total_matches` limit & `current_matches` counter
- **players** — 6 friends, supports rename
- **matches** — 4-player team match records with soft-delete & `edit_history` JSONB
- **player_stats** — pre-computed per-season aggregates (total_matches, wins, win_rate, deleted_at)
- **app_config** — key-value store (e.g. `honor_threshold`, `threshold_calc_method`)
- **users** — WeChat auth users (openid, role 'user'|'admin')
- **operation_logs** — 操作审计日志 (user_id, action, target_type, target_id, details JSONB)

### Backend (NestJS)

`server/src/` modules: **players**, **seasons**, **matches**, **stats**, **config**, **init**

All controllers use `getSupabaseClient()` directly — no service layer abstraction. Response format: `{ code, msg, data }`.

Key endpoints:
- `GET /api/stats/season?seasonId=X` — full season stats (awards, rankings, partner matrix, streaks)
- `GET/POST /api/config` — read/write `app_config` key-value
- `GET /api/stats/export` / `POST /api/stats/import` — full backup/restore

### Frontend (Taro + React)

8 pages across 5 tab bars (首页, 统计, 战绩, 赛季, 我的).

Use `import { Network } from '@/network'` for all API calls — it wraps Taro.request to prepend `PROJECT_DOMAIN`. Never call `Taro.request` directly.

Styling: Tailwind CSS 4 preferred. CSS files used when Tailwind can't express the style (gradients, complex animations). Pages have their own `index.css`.

### Pages

| Page | Purpose |
|------|---------|
| `pages/index/index` | Home — current season, recent matches, quick actions |
| `pages/stats/index` | Statistics — ranking table, awards/honor wall, partner matrix |
| `pages/records/index` | Match records list |
| `pages/record-detail/index` | Single match detail |
| `pages/record-form/index` | Record/edit a match |
| `pages/seasons/index` | Season management (CRUD) |
| `pages/arrange/index` | Match arrangement (pairing) |
| `pages/profile/index` | Settings — player management, export/import, honor threshold config |

### Key patterns

- **Honor threshold**: Config in `app_config` with key `honor_threshold` (50-100%). Applied to both awards (backend `calculateAwards`) and ranking table (frontend filter). Calculation method: `season_total` (default) or `avg_participation`, stored in `threshold_calc_method`.
- **Season stats**: Always computed from raw `matches` + pre-aggregated `player_stats` tables. Supports single-season and GOAT (all-time) modes.
- **Export/Import**: Full table dump/restore via JSON. Weapp uses clipboard; H5 uses file download/upload.
- **Player Avatars**: `players.avatar` stores base64 image data. `PlayerAvatar` component (`src/components/PlayerAvatar/`) renders avatar image or name initial fallback. Admin can upload avatars from the profile page via `Taro.chooseImage` → base64 → `PUT /api/players/:id`. All player name displays across pages now use `PlayerAvatar`.

---
## 身份验证系统 (2025-05-18 新增)

### 概述

Custom JWT + Passport 方案。微信小程序 `Taro.login()` → code → 后端调微信 API 换 openid → 签发 JWT。RolesGuard + `@Roles('admin')` 装饰器控制接口权限。

### 数据库

8 张表，新增 **users** 和 **operation_logs**：
- **users** — 微信用户认证 (openid UNIQUE, nickname, avatar_url, role 'user'|'admin', last_login_at)。服务启动时自动建表 + 初始化一个默认管理员 (openid: `__admin_default__`, role: admin)。

### 后端认证体系

`server/src/auth/` 模块：

| 文件 | 用途 |
|------|------|
| `auth.controller.ts` | 3 个端点：`POST /api/auth/login` (微信code登录)、`POST /api/auth/login/password` (H5备用)、`GET /api/auth/me` (当前用户信息) |
| `auth.service.ts` | 微信 code→openid 换 JWT、H5 密码登录、获取用户信息 |
| `strategies/jwt.strategy.ts` | Passport JWT 策略 — 从 `Authorization: Bearer <token>` 提取 payload，查询 users 表验证有效性 |
| `guards/roles.guard.ts` | 读取 `@Roles()` 元数据，检查 `user.role` 是否匹配 |
| `decorators/roles.decorator.ts` | `@Roles('admin')` |
| `decorators/current-user.decorator.ts` | `@CurrentUser()` 参数装饰器 |

登录流程：
```
小程序 Taro.login() → code → POST /api/auth/login { code }
    → 后端调微信 API (appid + secret + code) 换 openid
    → 查/建 users 表记录
    → 签发 JWT { userId, role, openid } (30天有效期)
    → 返回 { token, user: { id, nickname, avatarUrl, role } }
```

权限矩阵：

| 接口 | 权限 |
|------|------|
| `GET /api/players`, `GET /api/seasons/*` | 无需登录 |
| `POST/PUT /api/players/*` | admin |
| `POST /api/seasons`, `PUT /api/seasons/:id`, `PUT /api/seasons/:id/end` | admin |
| `POST /api/matches` / `PUT/DELETE :id` | 无需登录 |
| `POST /api/matches/clear-all` | admin |
| `GET /api/stats/season` | 无需登录 |
| `GET /api/stats/export` / `POST /api/stats/import` | admin |
| `GET /api/config` | 无需登录 |
| `POST /api/config` | admin |

### 前端认证

**`src/stores/authStore.ts`** — 核心 store (zustand 风格，直接从 Taro storage 读写)：
- `loginWithWechat()` — 调 `Taro.login()` → 发 code → 收 token → 持久化
- `loginWithPassword(password)` — H5 密码登录
- `logout()` — 清除 token + user
- `initAuth()` — 应用启动时调用：检查已有 token → 验证 `/api/auth/me` → 失效则重登录
- `getToken()`, `getStoredUser()` — 从 storage 读取

**`src/network.ts`** — 请求时自动从 `Taro.getStorageSync('auth_token')` 读取 token，注入 `Authorization: Bearer <token>` header。

**`src/app.ts`** — `useLaunch` + `useEffect` 调 `initAuth()`，等待认证初始化完成再渲染页面。

**页面权限控制**：
- `pages/profile/index` — 显示用户信息(头像、昵称、角色标签)、H5 密码登录表单、退出登录；admin 可见玩家管理(含头像上传)/数据备份/门槛配置/清空数据
- `pages/seasons/index` — admin 可见新建按钮、赛季操作(结束/编辑/删除)

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | `guandan-dev-secret-key` |
| `WECHAT_APPID` | 微信小程序 AppID | — |
| `WECHAT_APP_SECRET` | 微信小程序 AppSecret | — |
| `ADMIN_PASSWORD` | H5 备用密码登录 | `admin123` |

### 小程序发布须知

`project.config.json` 的 `appid` 需从 `touristappid` 改为真实 AppID，否则 `Taro.login()` 无法获取有效 code，认证不可用。H5 开发阶段可通过 `ADMIN_PASSWORD` 密码登录绕过。

---
## 认证测试指南

### H5 密码登录测试（curl）

服务启动后，用以下命令全流程验证认证系统：

```bash
# 1. 登录获取 token
TOKEN=$(curl -s http://localhost:3000/api/auth/login/password \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "TOKEN: ${TOKEN:0:30}..."

# 2. 查当前用户
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 3. 带 token 调用 admin 接口 → 应 200
curl -s http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"测试玩家"}' | python3 -m json.tool

# 4. 不带 token 调用 admin 接口 → 应 401
curl -s -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -d '{"name":"测试玩家"}' | python3 -m json.tool
```

### 已通过的测试结果

| 测试场景 | 预期 | 实际 |
|----------|------|------|
| 密码登录 | 返回 JWT token | ✅ |
| 查当前用户 | 返回 admin 用户信息 (role=admin) | ✅ |
| 带 token 创建玩家 | 200 创建成功 | ✅ |
| 不带 token 创建玩家 | 401 Unauthorized | ✅ |
| 公开接口（无需登录） | 200 正常返回 | ✅ |

