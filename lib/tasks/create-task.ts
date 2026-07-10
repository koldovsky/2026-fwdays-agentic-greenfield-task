import type { EnergyLevel, Task } from "@/lib/types";
import { createId } from "@/lib/storage/index";

const ENERGY_LEVELS: EnergyLevel[] = ["low", "medium", "high"];

export function isEnergyLevel(value: string | null | undefined): value is EnergyLevel {
  return value != null && ENERGY_LEVELS.includes(value as EnergyLevel);
}

export interface CreateTaskInput {
  title: string;
  energy?: EnergyLevel;
}

export function createTask(input: CreateTaskInput, now = new Date()): Task {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Task title is required");
  }

  if (input.energy && !isEnergyLevel(input.energy)) {
    throw new Error("Invalid energy level");
  }

  const timestamp = now.toISOString();

  return {
    id: createId("task"),
    title,
    energy: input.energy,
    steps: [],
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
