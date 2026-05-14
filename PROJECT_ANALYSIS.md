# 掼蛋战绩小程序 — 项目分析

> 分析日期：2026-05-12
> 基于 Coze Vibe Coding 生成的项目代码审查

---

## 项目概览

掼蛋战绩管理微信小程序，用于记录掼蛋（升级类扑克游戏）对战成绩。前后端分离架构。

**技术栈**:
- 前端: Taro 4 + React 18 + TypeScript + Tailwind CSS 4
- 后端: NestJS 10 + TypeScript
- 数据库: PostgreSQL via Supabase (Drizzle ORM Schema 定义但未使用)
- 构建: Vite 4 + pnpm
- 图标: lucide-react（依赖声明但未使用，实际用 emoji）

---

## 一、实现的功能需求

### 页面与功能清单

| 模块 | 功能 | 前端文件 | 后端文件 |
|------|------|----------|----------|
| **首页** | 当前赛季展示、最近战绩预览、快捷操作入口 | `src/pages/index/index.tsx` | — |
| **战绩列表** | 按赛季筛选、场次序号、编辑/删除跳转 | `src/pages/records/index.tsx` | `server/src/matches/matches.controller.ts` |
| **战绩录入** | 选4人分2队、牌级比分、自动/手动判胜、草稿保存 | `src/pages/record-form/index.tsx` | `server/src/matches/matches.controller.ts` |
| **战绩详情** | 查看/编辑战绩、编辑历史展示 | `src/pages/record-detail/index.tsx` | `server/src/matches/matches.controller.ts` |
| **统计分析** | 胜率排名、搭档统计、胜率矩阵、荣誉墙、赛季进度 | `src/pages/stats/index.tsx` | `server/src/stats/stats.controller.ts` |
| **赛季管理** | 赛季CRUD、设置总场次自动结束 | `src/pages/seasons/index.tsx` | `server/src/seasons/seasons.controller.ts` |
| **安排对阵** | 智能匹配算法：优先参赛少的人、减少重复搭档 | `src/pages/arrange/index.tsx` | — |
| **个人/设置** | 玩家管理、数据导入导出、荣誉门槛设置、清空数据 | `src/pages/profile/index.tsx` | 多个端点 |

### 业务规则

1. **掼蛋牌级**：2,3,4,5,6,7,8,9,10,J,Q,K,A1,A2,A3（共15级），索引越大牌越大
2. **判胜逻辑**：默认按牌级索引自动判断，比分相同时需手动选择获胜方
3. **积分规则**（荣誉墙）：胜3分 + 负1分
4. **荣誉门槛**：参赛场次 ≥ 赛季总场次 × 阈值（默认80%），低于门槛的玩家不参与荣誉评选
5. **赛季自动结束**：达到设置的总场次时自动标记为 ended
6. **软删除**：战绩标记 `is_deleted=true`，不从数据库物理删除
7. **编辑历史**：战绩每次修改记录到 `edit_history` JSONB 字段

### 荣誉墙奖项（6项）

| 奖项 | 规则 | 类型 |
|------|------|------|
| 🏆 胜率之王 | 胜率最高 | 个人 |
| 💎 掼蛋大富翁 | 总积分最高（胜3+负1） | 个人 |
| ⚡ 金牌收割机 | 场均积分最高 | 个人 |
| 🎪 全场最靓仔 | 参赛场次最多 | 个人 |
| 🔥 火力全开 | 胜场数最多 | 个人 |
| 🎲 逆袭王 | 输球场次多但胜率可观 | 个人 |

---

## 二、代码坏味道

### 🔴 严重问题

1. **ConfigController 引用了不存在的 Service 文件**
   - `server/src/config/config.controller.ts:2` 导入 `@/storage/supabase/supabase.service`
   - 该文件不存在，项目启动会崩溃
   - 项目中其他 Controller 都使用 `getSupabaseClient()` 直接调用

2. **每个页面重复定义 Icon 组件**
   - 8个页面各有一份完全相同的 emoji 版 `Icon` 组件（文件名各不相同但代码几乎一样）
   - AGENTS.md 要求用 `lucide-react-taro`，但实际 emoji 方案完全替代了它
   - `lucide-react` 包已下载但无人使用

3. **辅助函数严重重复**
   - `getPlayerName()`, `getPlayerInitial()`, `parseScore()`, `formatDate()` 在 `src/pages/index/index.tsx` 和 `src/pages/records/index.tsx` 中被完全复制两遍

### 🟡 架构问题

4. **NestJS Service 全部为空**
   - `PlayersService`, `MatchesService`, `SeasonsService`, `StatsService` 都是空类
   - 所有业务逻辑直接写在 Controller 中，违背 NestJS 分层设计

5. **Controller 末尾多余的导出类**
   - 每个 Controller 文件末尾都 export 了空 `*ControllerService` 类（如 `PlayersControllerService`）
   - 未被任何模块引用，是死代码

6. **Drizzle ORM Schema 定义了但未使用**
   - `server/src/storage/database/shared/schema.ts` 用 Drizzle 定义了完整表结构 + Zod Schema
   - 实际代码直接 `client.from('matches').select('*')` 操作 Supabase
   - Schema 纯属文档，没有运行时约束

7. **前端同时处理 camelCase 和 snake_case**
   - `Match` 类型同时定义 `team1Player1Id` / `team1_player1_id`、`winnerTeam` / `winner_team`
   - 代码里到处用 `||` 做双字段兼容
   - 只有 `seasons` Controller 做了手动字段名转换

### 🟠 代码质量问题

8. **大量 `any` 类型**
   - Controller 中 `body: any`, `matchData: any`, `updateData: any` 广泛使用
   - 破坏了 TypeScript 的类型保护

9. **CSS 文件占主导，Tailwind 未充分使用**
   - AGENTS.md 要求优先用 Tailwind
   - 但几乎所有页面都在独立的 `.css` 文件中写了大量自定义样式

10. **密钥文件提交到 Git**
    - `key/private.appid.key` 已入库（微信小程序 CI 私钥）
    - 安全风险

11. **useEffect 依赖不完整**
    - 多个页面 `// eslint-disable-next-line react-hooks/exhaustive-deps` 跳过依赖检查

12. **结束赛季接口意外清空数据**
    - `PUT seasons/:id/end` 会软删除该赛季所有战绩和统计数据
    - 语义不匹配：用户只希望结束赛季，不应清空数据

13. **硬编码时区 +08:00**
    - `matches.controller.ts:142` 和 `:294` 硬编码北京时间

### 🔵 细节问题

14. **变量名拼写**：`stats.controller.ts:199` `isAllTime` → 应为 `isAllTime`
15. **空壳文件**：`server/src/storage/database/shared/relations.ts` 导入空、输出空
16. **错误信息中英文混用**
17. **URL 缓存爆破**：首页用 `_t=${Date.now()}` 手动加时间戳，无统一拦截器

---

## 三、数据库表结构

### Supabase 表一览

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `seasons` | 赛季 | name, start_date, end_date, total_matches, current_matches, status |
| `players` | 玩家 | name, avatar |
| `matches` | 战绩 | season_id, team1_player1_id ~ team2_player2_id, winner_team, score, remark, is_deleted, edit_history |
| `player_stats` | 玩家统计 | season_id, player_id, total_matches, wins, win_rate |
| `app_config` | 配置 | key, value, description |
| `health_check` | 健康检查 | updated_at |

### 字段命名风格
- 数据库中统一使用 **snake_case**（如 `team1_player1_id`）
- 后端响应中部分做了手动 camelCase 转换（`seasons` 接口做了，`matches` 没做）
- 前端类型定义同时声明两种风格并用 `||` 取值

---

## 四、本地运行指南

### 环境要求

- Node.js >= 18
- pnpm >= 9.0.0
- Supabase 账户（免费版即可）
- （可选）微信开发者工具

### 步骤

```bash
# 1. 安装
pnpm install

# 2. 根目录创建 .env.local
COZE_SUPABASE_URL=https://xxxxx.supabase.co
COZE_SUPABASE_ANON_KEY=eyJxxxxx

# 3. 启动（前后端同时）
pnpm dev
# 前端: http://localhost:5000
# 后端: http://localhost:3000

# 单独启动
pnpm dev:web      # 仅前端 H5
pnpm dev:server   # 仅后端
```

### ⚠️ 已知启动障碍

1. **ConfigModule 报错** — 修复 `config.controller.ts` 中 `SupabaseService` 的引用，改为 `getSupabaseClient()`（如项目中其他 Controller 的做法）
2. **建表** — 需要在 Supabase SQL Editor 中手动建表，或创建 `exec_sql` RPC 函数让 InitService 自动建表

---

## 五、部署指南

### 部署架构

- **数据库**：Supabase（云，已配好）
- **后端 API**：NestJS，部署到自己的服务器
- **前端**：通过 Coze 平台已部署到微信小程序（H5 也可选）

### 后端部署步骤

#### 1. 准备服务器

Linux 服务器（阿里云/腾讯云轻量等），装好 Node.js >= 18 和 pnpm。

#### 2. 构建与上传

```bash
# 本地构建后端
pnpm build:server

# 把 server/ 目录传到服务器
scp -r server/ user@your-server:/path/to/server

# 服务器上安装生产依赖
cd /path/to/server
pnpm install --prod
```

#### 3. 配置环境变量

服务器上创建 `server/.env`：

```env
COZE_SUPABASE_URL=https://npqhrgmnyipjpuhedcok.supabase.co
COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 4. 用 PM2 启动

```bash
npm install -g pm2
pm2 start dist/main.js --name guandan-api -- -p 3000
pm2 save
pm2 startup  # 开机自启
```

#### 5. Nginx 反向代理 + SSL

```nginx
server {
    listen 443 ssl;
    server_name your-api-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 6. 小程序后台改域名白名单

**微信公众平台 → 开发管理 → 开发设置 → 服务器域名**，将 `request` 合法域名改为后端域名。

#### 7. 重新构建上传小程序

```bash
PROJECT_DOMAIN=https://your-api-domain.com pnpm build:weapp
```

用微信开发者工具打开 `dist/` 目录，上传代码并提交审核。

### 关键环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `COZE_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `COZE_SUPABASE_ANON_KEY` | Supabase anon key | 是 |
| `PROJECT_DOMAIN` | 前端请求的 API 域名（构建时用） | 是（生产） |
| `PORT` | 后端监听端口，默认 3000 | 否 |

### H5 部署（备选）

如需同时部署 H5 网页版：

```bash
pnpm build:web
# 产物在 dist-web/，是纯静态文件
```

Nginx 同时托管静态文件和 API 转发：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    root /path/to/dist-web;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000;
    }
}
```
