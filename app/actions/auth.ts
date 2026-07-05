"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/app/lib/csrf";
import { createSession, deleteSession } from "@/app/lib/session";
import {
  LoginFormSchema,
  RegisterFormSchema,
  type FormState,
} from "@/app/lib/definitions";

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";
const SALT_ROUNDS = 10;

export async function register(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  await assertSameOrigin();

  const validatedFields = RegisterFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { errors: { email: ["This email is already registered."] } };
    }
    throw error;
  }

  await createSession(userId);
  redirect("/notes");
}

export async function login(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  await assertSameOrigin();

  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: GENERIC_LOGIN_ERROR };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { message: GENERIC_LOGIN_ERROR };
  }

  await createSession(user.id);
  redirect("/notes");
}

export async function logout() {
  await assertSameOrigin();
  await deleteSession();
  redirect("/login");
}
