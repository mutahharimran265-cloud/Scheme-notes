/*
  Warnings:

  - Added the required column `updatedAt` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schematicFileId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "xPercent" REAL,
    "yPercent" REAL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_schematicFileId_fkey" FOREIGN KEY ("schematicFileId") REFERENCES "SchematicFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("authorName", "body", "createdAt", "id", "parentCommentId", "resolved", "schematicFileId", "xPercent", "yPercent") SELECT "authorName", "body", "createdAt", "id", "parentCommentId", "resolved", "schematicFileId", "xPercent", "yPercent" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_schematicFileId_idx" ON "Comment"("schematicFileId");
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
