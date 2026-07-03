import { z } from 'zod';
import { validatePassword } from '@honeydo/shared';

const email = z.string().trim().email('Enter a valid email');

/** Sign-in only needs a non-empty password; the server verifies it. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

/** Sign-up enforces the shared password policy (one source of truth, FR-AUTH-01). */
export const signUpSchema = z.object({
  name: z.string().trim().max(80, 'Name is too long').optional(),
  email,
  password: z.string().superRefine((value, ctx) => {
    const result = validatePassword(value);
    if (!result.valid) {
      ctx.addIssue({
        code: 'custom',
        message: `Password needs ${result.errors.join(', ')}`,
      });
    }
  }),
});

/** Union of both forms; `name` is only present in sign-up. */
export type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
};
