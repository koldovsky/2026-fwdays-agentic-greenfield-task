import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes with the Bearer access JWT; unauthenticated requests get 401. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
