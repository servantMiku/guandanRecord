import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { PlayersModule } from '@/players/players.module';
import { SeasonsModule } from '@/seasons/seasons.module';
import { MatchesModule } from '@/matches/matches.module';
import { StatsModule } from '@/stats/stats.module';
import { InitModule } from '@/init/init.module';
import { ConfigModule } from '@/config/config.module';
import { AuthModule } from '@/auth/auth.module';
import { OperationLogModule } from '@/operation-log/operation-log.module';

@Module({
  imports: [PlayersModule, SeasonsModule, MatchesModule, StatsModule, InitModule, ConfigModule, AuthModule, OperationLogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
