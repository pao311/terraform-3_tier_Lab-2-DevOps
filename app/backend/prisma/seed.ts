import { PrismaClient } from '@prisma/client';
import { STUDENT_SEED_DATA } from '../src/students/students.seed-data';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.student.createMany({
      data: STUDENT_SEED_DATA,
      skipDuplicates: true,
    });
    await tx.seedState.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        isSeeded: true,
        seededAt: new Date(),
      },
      update: {
        isSeeded: true,
        seededAt: new Date(),
      },
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
