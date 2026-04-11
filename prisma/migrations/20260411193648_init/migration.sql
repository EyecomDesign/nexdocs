-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('PUBLIC', 'PARTNER', 'ADMIN');

-- CreateTable
CREATE TABLE "PageVisibility" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'PUBLIC',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionVisibility" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'ADMIN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageVisibility_path_key" ON "PageVisibility"("path");

-- CreateIndex
CREATE UNIQUE INDEX "SectionVisibility_path_key" ON "SectionVisibility"("path");
