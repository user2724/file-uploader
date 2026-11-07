/*
  Warnings:

  - Made the column `fileUrl` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "File" ALTER COLUMN "fileUrl" SET NOT NULL;
