/*
  Warnings:

  - Added the required column `contentType` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "contentType" TEXT NOT NULL;
