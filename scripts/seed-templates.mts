// Seed the two read-only templates (FR-TPL-01, FR-TPL-03). Idempotent and
// re-runnable: upserts each template by its natural key (name) and each
// question by (templateId, order), never deletes. Every seed template is
// re-validated with `templateSchema` BEFORE any write, so malformed seed data
// fails fast at the boundary and nothing is written.
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

  for (const question of template.questions) {
    // `anchors` is the Json? column: the validated anchor array for scale, a
    // true SQL NULL for open. `Prisma.DbNull` writes NULL (not the JSON null
    // literal); the plain anchor array is accepted directly as the JSON value.
    const anchors = question.type === "scale" ? question.anchors : Prisma.DbNull;

    await db.question.upsert({
      // Keyed by (templateId, order) so re-runs leave existing question ids
      // untouched — downstream cycle snapshots reference those ids.
      where: { templateId_order: { templateId: row.id, order: question.order } },
      update: {
        text: question.text,
        type: question.type,
        required: question.required,
        anchors,
      },
      create: {
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
