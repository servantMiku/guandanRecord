import { Controller, Get, Put, Body } from "@nestjs/common";
import { SupabaseService } from "@/storage/supabase/supabase.service";

@Controller("config")
export class ConfigController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  async getConfig() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from("app_config")
      .select("*");

    if (error) {
      console.error("获取配置失败:", error);
      return { data: [] };
    }

    const config: Record<string, string> = {};
    data?.forEach((item) => {
      config[item.key] = item.value;
    });

    return { data: config };
  }

  @Put()
  async updateConfig(@Body() body: { key: string; value: string; description?: string }) {
    const client = this.supabaseService.getClient();

    // Try to update first
    const { error: updateError } = await client
      .from("app_config")
      .update({ value: body.value, updated_at: new Date().toISOString() })
      .eq("key", body.key);

    if (updateError) {
      console.error("更新配置失败:", updateError);
      return { data: null, msg: "更新配置失败", code: 500 };
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
        return { data: null, msg: "插入配置失败", code: 500 };
      }
    }

    return { data: { key: body.key, value: body.value }, msg: "保存成功", code: 200 };
  }
}