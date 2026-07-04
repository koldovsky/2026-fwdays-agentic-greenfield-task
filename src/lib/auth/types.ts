export type UserRole = "user" | "admin";

export type StoredUser = {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type SessionPayload = SessionUser & {
  exp: number;
};
