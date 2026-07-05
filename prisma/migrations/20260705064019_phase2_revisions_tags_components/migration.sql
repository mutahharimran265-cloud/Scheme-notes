-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Revision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME
);

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
    "carriedFromId" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "componentRef" TEXT,
    "partNumber" TEXT,
    "datasheetUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_schematicFileId_fkey" FOREIGN KEY ("schematicFileId") REFERENCES "SchematicFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_carriedFromId_fkey" FOREIGN KEY ("carriedFromId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("authorName", "authorToken", "body", "createdAt", "id", "pageNumber", "parentCommentId", "resolved", "schematicFileId", "status", "updatedAt", "xPercent", "yPercent") SELECT "authorName", "authorToken", "body", "createdAt", "id", "pageNumber", "parentCommentId", "resolved", "schematicFileId", "status", "updatedAt", "xPercent", "yPercent" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_schematicFileId_idx" ON "Comment"("schematicFileId");
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");
CREATE INDEX "Comment_carriedFromId_idx" ON "Comment"("carriedFromId");
CREATE TABLE "new_SchematicFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "originalUrl" TEXT,
    "originalName" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisionId" TEXT,
    CONSTRAINT "SchematicFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchematicFile_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "Revision" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SchematicFile" ("fileType", "fileUrl", "id", "originalName", "originalUrl", "projectId", "uploadedAt") SELECT "fileType", "fileUrl", "id", "originalName", "originalUrl", "projectId", "uploadedAt" FROM "SchematicFile";
DROP TABLE "SchematicFile";
ALTER TABLE "new_SchematicFile" RENAME TO "SchematicFile";
CREATE INDEX "SchematicFile_projectId_idx" ON "SchematicFile"("projectId");
CREATE INDEX "SchematicFile_revisionId_idx" ON "SchematicFile"("revisionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Revision_projectId_idx" ON "Revision"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");
