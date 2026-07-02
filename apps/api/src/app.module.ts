import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { InsightModule } from './insight/insight.module';
import { PrismaModule } from './prisma/prisma.module';
import { TagsModule } from './tags/tags.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TagsModule,
    TimeEntriesModule,
    InsightModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
