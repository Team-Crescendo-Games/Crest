import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log("Connected. Cleaning up partial migration state...");

  // Drop tables/columns that may have been partially created by the failed migration
  await client.query(`DROP TABLE IF EXISTS "WorkspaceApplication" CASCADE`);
  await client.query(`DROP TABLE IF EXISTS "Role" CASCADE`);
  await client.query(`ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "createdById"`);
  await client.query(`ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "description"`);
  await client.query(`ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "headerExt"`);
  await client.query(`ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "iconExt"`);
  await client.query(`ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "joinPolicy"`);
  // roleId may have been partially added
  await client.query(`ALTER TABLE "WorkspaceMember" DROP COLUMN IF EXISTS "roleId"`);

  // Re-add the "role" column if it was dropped
  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'WorkspaceMember' AND column_name = 'role'
  `);
  if (rows.length === 0) {
    await client.query(`ALTER TABLE "WorkspaceMember" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'MEMBER'`);
    console.log("Restored 'role' column on WorkspaceMember.");
  }

  console.log("Cleanup done. Now run:");
  console.log("  npx prisma migrate resolve --rolled-back 20260222114947_add_workspace_roles");
  console.log("  npx prisma migrate deploy");

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
