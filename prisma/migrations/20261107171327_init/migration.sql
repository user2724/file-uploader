/*
  Warnings:

  - Added the required column `folderId` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "filename" TEXT,
ADD COLUMN     "folderId" INTEGER NOT NULL,
ADD COLUMN     "size" TEXT;

-- CreateTable
CREATE TABLE "Folder" (
    "id" SERIAL NOT NULL,
    "folderName" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
