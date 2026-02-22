-- AlterTable: Add new Workspace columns
ALTER TABLE "Workspace" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "headerExt" TEXT,
ADD COLUMN     "iconExt" TEXT,
ADD COLUMN     "joinPolicy" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: Role (must exist before backfill)
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "permissions" INTEGER NOT NULL DEFAULT 0,
    "workspaceId" INTEGER NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_workspaceId_name_key" ON "Role"("workspaceId", "name");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default roles for every existing workspace
-- Owner: all permissions (31), Admin: all except delete (30), Member: invite only (4)
INSERT INTO "Role" ("name", "color", "permissions", "workspaceId")
SELECT 'Owner', '#EF4444', 31, "id" FROM "Workspace";

INSERT INTO "Role" ("name", "color", "permissions", "workspaceId")
SELECT 'Admin', '#F59E0B', 30, "id" FROM "Workspace";

INSERT INTO "Role" ("name", "color", "permissions", "workspaceId")
SELECT 'Member', '#6B7280', 4, "id" FROM "Workspace";

-- Step 1: Add roleId as NULLABLE first
ALTER TABLE "WorkspaceMember" ADD COLUMN "roleId" INTEGER;

-- Step 2: Backfill roleId from the old text "role" column
-- Map OWNER -> Owner role, ADMIN -> Admin role, everything else -> Member role
UPDATE "WorkspaceMember" wm
SET "roleId" = r."id"
FROM "Role" r
WHERE r."workspaceId" = wm."workspaceId"
  AND r."name" = CASE
    WHEN wm."role" = 'OWNER' THEN 'Owner'
    WHEN wm."role" = 'ADMIN' THEN 'Admin'
    ELSE 'Member'
  END;

-- Step 3: Set NOT NULL now that all rows have a value
ALTER TABLE "WorkspaceMember" ALTER COLUMN "roleId" SET NOT NULL;

-- Step 4: Drop the old text column
ALTER TABLE "WorkspaceMember" DROP COLUMN "role";

-- CreateTable: WorkspaceApplication
CREATE TABLE "WorkspaceApplication" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "message" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceApplication_userId_workspaceId_key" ON "WorkspaceApplication"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceApplication" ADD CONSTRAINT "WorkspaceApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceApplication" ADD CONSTRAINT "WorkspaceApplication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
