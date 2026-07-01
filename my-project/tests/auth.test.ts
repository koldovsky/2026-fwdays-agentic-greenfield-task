import { describe, expect, it } from "vitest";
import { authenticate, canManageMasterData } from "@/lib/auth/core";
import { seedData } from "@/lib/seed";

describe("authentication policy", () => {
  // @trace FR-1 FR-3 FR-6 FR-7
  it("accepts the active seeded admin and rejects invalid credentials", () => {
    expect(authenticate(seedData.users, "test", "test")?.role).toBe("Admin");
    expect(authenticate(seedData.users, "test", "wrong")).toBeNull();
  });

  it("restricts master data to admins", () => {
    expect(canManageMasterData("Admin")).toBe(true);
    expect(canManageMasterData("Staff")).toBe(false);
  });
});

// @trace FR-1
// @trace FR-3
// @trace FR-6
// @trace FR-7
