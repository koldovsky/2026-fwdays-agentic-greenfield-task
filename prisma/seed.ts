import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "notely-demo-1";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@notely.dev" },
    update: {},
    create: {
      email: "demo@notely.dev",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    },
  });

  const folder = await prisma.folder.create({
    data: { name: "Personal", userId: user.id },
  });

  const [workTag, ideaTag] = await Promise.all([
    prisma.tag.create({ data: { name: "work", userId: user.id } }),
    prisma.tag.create({ data: { name: "idea", userId: user.id } }),
  ]);

  await prisma.note.create({
    data: {
      userId: user.id,
      folderId: folder.id,
      title: "Welcome to Notely",
      content: "# Welcome\n\nThis is your first note.",
      isPinned: true,
      tags: { create: [{ tagId: workTag.id }] },
    },
  });

  await prisma.note.create({
    data: {
      userId: user.id,
      title: "Untitled idea",
      content: "Something to expand on later.",
      tags: { create: [{ tagId: ideaTag.id }] },
    },
  });

  await prisma.note.create({
    data: {
      userId: user.id,
      title: "Old draft",
      content: "No longer needed.",
      deletedAt: new Date(),
    },
  });

  console.log(`Seeded user ${user.email} (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
