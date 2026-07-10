import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks an endpoint as reachable without a session (design D5). The
// allowlist is deliberately tiny: health + the OTP endpoints themselves.
// Everything else fails closed with 401.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
