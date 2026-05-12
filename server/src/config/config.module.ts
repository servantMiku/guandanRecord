import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { SupabaseService } from '@/storage/supabase/supabase.service';

@Module({
  controllers: [ConfigController],
  providers: [SupabaseService],
})
export class ConfigModule {}