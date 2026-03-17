-- CreateTable
CREATE TABLE "SeedState" (
    "id" INTEGER NOT NULL,
    "isSeeded" BOOLEAN NOT NULL DEFAULT false,
    "seededAt" TIMESTAMP(3),

    CONSTRAINT "SeedState_pkey" PRIMARY KEY ("id")
);
