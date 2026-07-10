import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: every feature module (health now, domain modules in S-02+) needs
// the same single PrismaClient instance.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
