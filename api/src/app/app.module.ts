import { Module } from '@nestjs/common';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { HousesModule } from './houses/houses.module';
import { PrismaModule } from './prisma/prisma.module';
import { SpaModule } from './spa/spa.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    HousesModule,
    TicketsModule,
    AttachmentsModule,
    SpaModule.forRoot(),
  ],
})
export class AppModule {}
