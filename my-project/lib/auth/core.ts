import type { Role, User } from "../types";

export const authenticate = (users: User[], username: string, password: string) => users.find((user) => user.isActive && user.username === username && user.passwordHash === password) ?? null;
export const canManageMasterData = (role: Role) => role === "Admin";

