import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { getSupabaseClient } from "../storage/database/supabase-client";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { OperationLogService } from "../operation-log/operation-log.service";

@Controller("config")
export class ConfigController {
  constructor(private readonly logService: OperationLogService) {}

  @Get()
  async getConfig() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("app_config")
      .select("*");

    if (error) {
      console.error("获取配置失败:", error);
      return { code: 500, msg: "获取配置失败", data: null };
    }

    const config: Record<string, string> = {};
    data?.forEach((item) => {
      config[item.key] = item.value;
    });

    return { code: 200, msg: "success", data: config };
  }

  // 兼容：GET /api/config/honor_threshold 返回单个配置项
  @Get(":key")
  async getConfigByKey(@Param("key") key: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("app_config")
      .select("*")
      .eq("key", key)
      .single();

    if (error) {
      console.error("获取配置项失败:", error);
      return { code: 500, msg: "获取配置项失败", data: null };
    }

    return { code: 200, msg: "success", data };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async updateConfig(@Body() body: { key: string; value: string; description?: string }, @CurrentUser() user: any) {
    const client = getSupabaseClient();

    // Try to update first
    const { error: updateError } = await client
      .from("app_config")
      .update({ value: body.value, updated_at: new Date().toISOString() })
      .eq("key", body.key);

    if (updateError) {
      console.error("更新配置失败:", updateError);
      return { code: 500, msg: "更新配置失败", data: null };
    }

    // If no rows were updated, insert new
    const { data: existing } = await client
      .from("app_config")
      .select("id")
      .eq("key", body.key)
      .single();

    if (!existing) {
      const { error: insertError } = await client
        .from("app_config")
        .insert({
          key: body.key,
          value: body.value,
          description: body.description || "",
        });

      if (insertError) {
        console.error("插入配置失败:", insertError);
        return { code: 500, msg: "插入配置失败", data: null };
      }
    }

    // 记录操作日志
    this.logService.log({
      action: 'config',
      target_type: 'config',
      target_id: body.key,
      user_id: user?.userId,
      details: { key: body.key, value: body.value },
    })

    return { code: 200, msg: "保存成功", data: { key: body.key, value: body.value } };
  }
}