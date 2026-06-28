// Seed the two read-only templates (FR-TPL-01, FR-TPL-03). Idempotent and
// re-runnable: upserts each template by its natural key (name) and each
// question by its stable id (the seed-provided id IS the DB primary key, so it
// is stable across reads and re-seeds — FR-TPL-02). After upserting, any
// question row of THAT template whose id is not in the seeded set is removed,
// so a re-seed always leaves exactly the seeded question set (no stale rows if
// a template later shrinks). Other templates are never touched. Every seed
// template is re-validated with `templateSchema` BEFORE any write, so malformed
// seed data fails fast at the boundary and nothing is written.
//
//   node scripts/seed-templates.mts
//
// Also wired as `prisma db seed` via prisma.config.ts. Env (DATABASE_URL) is
// loaded from .env / .env.local first, before the DB client is imported.
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file absent — fine
  }
}

// Dynamic imports so process.loadEnvFile runs before lib/db reads DATABASE_URL.
const { db } = await import("../lib/db/index.ts");
const { Prisma } = await import("@prisma/client");
const { templateSchema } = await import("../lib/schemas/template.ts");
const { seedTemplates } = await import("../lib/templates/seed-data.ts");

for (const candidate of seedTemplates) {
  // Re-validate at the write boundary; parsing throws on malformed data.
  const template = templateSchema.parse(candidate);

  // Upsert the template by name (the stable natural key). On a re-run the
  // existing row is matched and its methodology refreshed; questions follow.
  const existing = await db.template.findFirst({ where: { name: template.name } });
  const row = existing
    ? await db.template.update({
        where: { id: existing.id },
        data: { methodology: template.methodology },
      })
    : await db.template.create({
        data: { name: template.name, methodology: template.methodology },
      });

  // Remove any stale question of this template that is no longer seeded BEFORE
  // upserting. This drops pre-existing rows (e.g. earlier cuid-keyed seeds, or
  // a shrunk count) that would otherwise collide on the (templateId, order)
  // unique constraint when a seeded id reclaims their order. Scoped to this
  // template only; other templates are untouched.
  const seededIds = template.questions.map((question) => question.id);
  await db.question.deleteMany({
    where: { templateId: row.id, id: { notIn: seededIds } },
  });

  for (const question of template.questions) {
    // `anchors` is the Json? column: the validated anchor array for scale, a
    // true SQL NULL for open. `Prisma.DbNull` writes NULL (not the JSON null
    // literal); the plain anchor array is accepted directly as the JSON value.
    const anchors = question.type === "scale" ? question.anchors : Prisma.DbNull;

    await db.question.upsert({
      // Keyed by the stable seed id, so the DB primary key IS that id and stays
      // stable across re-seeds — downstream cycle snapshots reference it.
      where: { id: question.id },
      update: {
        templateId: row.id,
        order: question.order,
        text: question.text,
        type: question.type,
        required: question.required,
        anchors,
      },
      create: {
        id: question.id,
        templateId: row.id,
        order: question.order,
        text: question.text,
        type: question.type,
        required: question.required,
        anchors,
      },
    });
  }

  console.log(`Template ready: ${row.name} (${template.questions.length} questions)`);
}

await db.$disconnect();
