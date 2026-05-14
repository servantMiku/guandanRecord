import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { getSupabaseClient } from "../storage/database/supabase-client";

@Controller("config")
export class ConfigController {
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
  async updateConfig(@Body() body: { key: string; value: string; description?: string }) {
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

    return { code: 200, msg: "保存成功", data: { key: body.key, value: body.value } };
  }
}