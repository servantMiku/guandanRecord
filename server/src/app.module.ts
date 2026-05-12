import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { PlayersModule } from '@/players/players.module';
import { SeasonsModule } from '@/seasons/seasons.module';
import { MatchesModule } from '@/matches/matches.module';
import { StatsModule } from '@/stats/stats.module';
import { InitModule } from '@/init/init.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [PlayersModule, SeasonsModule, MatchesModule, StatsModule, InitModule, ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
