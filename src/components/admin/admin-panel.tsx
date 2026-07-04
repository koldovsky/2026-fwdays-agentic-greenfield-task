"use client";

import { useEffect, useState } from "react";

import type { UserRole } from "@/lib/auth/types";

type SafeUser = {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
};

export function AdminPanel() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { users?: SafeUser[]; error?: string };
      if (res.ok) setUsers(data.users ?? []);
      else setError(data.error ?? "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create user.");
      return;
    }
    setUsername("");
    setPassword("");
    setRole("user");
    await refresh();
  }

  return (
    <>
      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-violet-950">Add user</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="user">User (can book)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Create user
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-violet-950">Users</h2>
        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">{u.username}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-700">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
