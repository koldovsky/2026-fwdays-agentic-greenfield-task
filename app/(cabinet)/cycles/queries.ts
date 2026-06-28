// @trace FR-CYCLE-05
import { db } from "@/lib/db";
import { deriveStatus, daysRemaining } from "@/lib/cycles/status";
import { snapshotSchema } from "@/lib/cycles/snapshot";

/**
 * List all cycles, enriched with derived status, days remaining, and
 * answered/total progress (FR-CYCLE-05). A fetch failure throws and is caught
 * by the cabinet error.tsx boundary — never a raw 500. Snapshot parsing
 * failures degrade gracefully (null snapshot, logged server-side).
 */
export async function listCycles() {
  const cycles = await db.cycle.findMany({
    include: {
      subject: {
        select: { id: true, fullName: true, archived: true },
      },
      response: {
        include: {
          _count: { select: { answers: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return cycles.map((cycle) => {
    const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
    if (!snapshotResult.success) {
      console.warn(
        `[cycles/queries] Cycle ${cycle.id} has an invalid templateSnapshot:`,
        snapshotResult.error.message,
      );
    }
    const snapshot = snapshotResult.success ? snapshotResult.data : null;

    // completedAt is not stored separately; use stored status "done" as the
    // proxy, and re-derive expired vs collecting from the deadline + now.
    const completedAt = cycle.status === "done" ? cycle.updatedAt : null;
    const status = deriveStatus(
      { completedAt, deadline: cycle.deadline },
      now,
    );
    const days = daysRemaining(cycle.deadline, now);
    const totalRequired = snapshot?.questions.filter((q) => q.required).length ?? 0;
    const answered = cycle.response?._count.answers ?? 0;

    return {
      id: cycle.id,
      token: cycle.token,
      status,
      daysRemaining: days,
      deadline: cycle.deadline,
      createdAt: cycle.createdAt,
      subject: cycle.subject,
      snapshot,
      answered,
      total: totalRequired,
    };
  });
}

export type CycleListRow = Awaited<ReturnType<typeof listCycles>>[number];

/**
 * Load a single cycle by id for the detail page (FR-CYCLE-05). Returns null
 * when not found — callers render a calm not-found, never a 500.
 */
export async function getCycleById(id: string) {
  const cycle = await db.cycle.findUnique({
    where: { id },
    include: {
      subject: { select: { fullName: true } },
      template: { select: { name: true } },
    },
  });

  if (cycle === null) return null;

  const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
  if (!snapshotResult.success) {
    console.warn(
      `[cycles/queries] Cycle ${cycle.id} has an invalid templateSnapshot:`,
      snapshotResult.error.message,
    );
  }
  const snapshot = snapshotResult.success ? snapshotResult.data : null;

  return {
    id: cycle.id,
    token: cycle.token,
    status: cycle.status,
    deadline: cycle.deadline,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
    subject: cycle.subject,
    template: cycle.template,
    snapshot,
  };
}

export type CycleDetail = NonNullable<Awaited<ReturnType<typeof getCycleById>>>;
