import { HttpContextToken } from '@angular/common/http';

// Marks requests where a 401 is an expected answer (the bootstrap session
// probe), not an expired session. Lives outside the interceptor so that
// auth-api → interceptor → facade → auth-api never forms an import cycle.
export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);
