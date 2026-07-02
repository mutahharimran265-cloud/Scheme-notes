-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schematicFileId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorToken" TEXT,
    "body" TEXT NOT NULL,
    "xPercent" REAL,
    "yPercent" REAL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_schematicFileId_fkey" FOREIGN KEY ("schematicFileId") REFERENCES "SchematicFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("authorName", "authorToken", "body", "createdAt", "id", "parentCommentId", "resolved", "schematicFileId", "updatedAt", "xPercent", "yPercent") SELECT "authorName", "authorToken", "body", "createdAt", "id", "parentCommentId", "resolved", "schematicFileId", "updatedAt", "xPercent", "yPercent" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_schematicFileId_idx" ON "Comment"("schematicFileId");
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Project" ("createdAt", "id", "ownerEmail", "title") SELECT "createdAt", "id", "ownerEmail", "title" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SchematicFile_projectId_key" ON "SchematicFile"("projectId");
