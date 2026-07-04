import fs from "node:fs/promises";
import path from "node:path";

import type { ScheduledJob } from "@/lib/booking/schedule/types";

const DATA_DIR = process.env.COLIBRI_DATA_DIR ?? path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "scheduled-bookings.json");

async function ensureStore(): Promise<ScheduledJob[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as ScheduledJob[];
  } catch {
    return [];
  }
}

async function writeStore(jobs: ScheduledJob[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(jobs, null, 2), "utf8");
}

export async function listScheduledJobs(): Promise<ScheduledJob[]> {
  return ensureStore();
}

export async function getScheduledJob(id: string): Promise<ScheduledJob | undefined> {
  const jobs = await ensureStore();
  return jobs.find((j) => j.id === id);
}

export async function addScheduledJobs(newJobs: ScheduledJob[]): Promise<ScheduledJob[]> {
  const jobs = await ensureStore();
  jobs.push(...newJobs);
  await writeStore(jobs);
  return newJobs;
}

export async function updateScheduledJob(
  id: string,
  patch: Partial<ScheduledJob>,
): Promise<ScheduledJob | undefined> {
  const jobs = await ensureStore();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return undefined;
  jobs[idx] = { ...jobs[idx], ...patch };
  await writeStore(jobs);
  return jobs[idx];
}

export async function upsertScheduledJobs(updated: ScheduledJob[]): Promise<void> {
  const jobs = await ensureStore();
  const byId = new Map(jobs.map((j) => [j.id, j]));
  for (const job of updated) byId.set(job.id, job);
  await writeStore([...byId.values()]);
}

export async function deleteScheduledJob(id: string): Promise<boolean> {
  const jobs = await ensureStore();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return false;
  jobs.splice(idx, 1);
  await writeStore(jobs);
  return true;
}
