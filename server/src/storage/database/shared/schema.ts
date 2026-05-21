import { pgTable, serial, timestamp, varchar, text, boolean, integer, jsonb, index, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
})

// Seasons - 赛季表
export const seasons = pgTable(
  "seasons",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    startDate: varchar("start_date", { length: 10 }).notNull(), // YYYY-MM-DD
    endDate: varchar("end_date", { length: 10 }), // YYYY-MM-DD
    totalMatches: integer("total_matches"), // 赛季总场次（可选，为空表示不限制）
    currentMatches: integer("current_matches").notNull().default(0), // 当前已进行场次
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, ended
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("seasons_status_idx").on(table.status),
  ]
);

// Players - 玩家表（6位好友）
export const players = pgTable(
  "players",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 50 }).notNull(),
    avatar: text("avatar"), // 头像URL（可选）
    userId: varchar("user_id", { length: 36 }), // 绑定的用户ID
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("players_name_idx").on(table.name),
    index("players_user_id_idx").on(table.userId),
  ]
);

// Matches - 战绩表
export const matches = pgTable(
  "matches",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    seasonId: varchar("season_id", { length: 36 }).notNull(),
    team1Player1Id: varchar("team1_player1_id", { length: 36 }).notNull(),
    team1Player2Id: varchar("team1_player2_id", { length: 36 }).notNull(),
    team2Player1Id: varchar("team2_player1_id", { length: 36 }).notNull(),
    team2Player2Id: varchar("team2_player2_id", { length: 36 }).notNull(),
    winnerTeam: integer("winner_team").notNull(), // 1 or 2
    score: varchar("score", { length: 20 }).notNull(), // 如 "A1:J"
    remark: text("remark"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
    editHistory: jsonb("edit_history").$type<Array<{ 
      timestamp: string; 
      action: string; 
      operator: string; 
      details: any 
    }>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("matches_season_idx").on(table.seasonId),
    index("matches_deleted_idx").on(table.isDeleted),
  ]
);

// Player Stats - 玩家统计表
export const playerStats = pgTable(
  "player_stats",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    seasonId: varchar("season_id", { length: 36 }).notNull(),
    playerId: varchar("player_id", { length: 36 }).notNull(),
    totalMatches: integer("total_matches").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    winRate: varchar("win_rate", { length: 10 }).notNull().default("0.00"), // 百分比字符串
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("player_stats_season_idx").on(table.seasonId),
    index("player_stats_player_idx").on(table.playerId),
  ]
);

// Users - 微信用户认证表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    openid: varchar("openid", { length: 100 }).notNull().unique(),
    nickname: varchar("nickname", { length: 100 }),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("users_openid_idx").on(table.openid),
  ]
);

// Operation Logs - 操作审计日志
export const operationLogs = pgTable(
  "operation_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }),
    userName: varchar("user_name", { length: 100 }),
    action: varchar("action", { length: 50 }).notNull(),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: varchar("target_id", { length: 100 }),
    details: jsonb("details").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("operation_logs_created_idx").on(table.createdAt),
    index("operation_logs_target_idx").on(table.targetType, table.targetId),
  ]
);

// App config table
export const appConfig = pgTable("app_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

export const insertSeasonSchema = createCoercedInsertSchema(seasons).pick({
  name: true,
  startDate: true,
  endDate: true,
});

export const insertPlayerSchema = createCoercedInsertSchema(players).pick({
  name: true,
});

export const insertMatchSchema = createCoercedInsertSchema(matches).pick({
  seasonId: true,
  team1Player1Id: true,
  team1Player2Id: true,
  team2Player1Id: true,
  team2Player2Id: true,
  winnerTeam: true,
  score: true,
  remark: true,
});

export const updateMatchSchema = createCoercedInsertSchema(matches)
  .pick({
    winnerTeam: true,
    score: true,
    remark: true,
  })
  .partial();

// TypeScript types
export type Season = typeof seasons.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type UpdateMatch = z.infer<typeof updateMatchSchema>;

export type User = typeof users.$inferSelect;
export type PlayerStats = typeof playerStats.$inferSelect;
