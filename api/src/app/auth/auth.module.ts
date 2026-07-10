import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AUTH_CONFIG, AuthConfig, authConfigProvider } from './auth-config';
import { AuthCleanupService } from './auth-cleanup.service';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { SMS_SENDER, SmsSender } from './sms/sms-sender';
import { createSmsSender } from './sms/sms-sender.factory';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AuthController],
  providers: [
    // Config resolves at DI bootstrap — a misconfigured process never
    // starts (ADR-0004 fail-fast, spec: prod without TurboSMS credential)
    authConfigProvider,
    {
      provide: SMS_SENDER,
      useFactory: (config: AuthConfig): SmsSender => createSmsSender(config),
      inject: [AUTH_CONFIG],
    },
    OtpService,
    SessionService,
    AuthCleanupService,
    // Secure by default: every endpoint outside the @Public() allowlist
    // requires a session (design D5)
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [SessionService],
})
export class AuthModule {}
