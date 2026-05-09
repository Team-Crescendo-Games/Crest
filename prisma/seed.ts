/**
 * Dev seed script (JSON-driven).
 *
 * Reads fixtures from prisma/seed-data/*.json and populates the local dev DB.
 * Each fixture uses a stable `key` so other fixtures can reference it
 * (e.g. a task references its author by user key).
 *
 * Run: npm run db:seed
 *
 * SAFETY: This script wipes all data in the tables it touches before inserting
 * and refuses to run unless DATABASE_URL points to localhost.
 * Do NOT run against a production database.
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ALL_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS } from "../lib/permissions";

// Load .env.local with precedence over .env for local dev.
dotenv.config({
  path: path.join(__dirname, "..", ".env.local"),
  override: true,
});

// ── Fixture types ──────────────────────────────────────────────────────────

interface UserFixture {
  key: string;
  name: string;
  email: string;
}

interface RoleFixture {
  key: string;
  name: string;
  color: string;
  permissions: "ALL" | "DEFAULT_MEMBER" | number;
}

interface MemberFixture {
  user: string;
  role: string;
}

interface WorkspaceFixture {
  key: string;
  name: string;
  description?: string;
  joinPolicy: "INVITE_ONLY" | "APPLY_TO_JOIN" | "OPEN";
  createdBy: string;
  roles: RoleFixture[];
  members: MemberFixture[];
}

interface TagFixture {
  key: string;
  workspace: string;
  name: string;
  color: string;
}

interface BoardFixture {
  key: string;
  workspace: string;
  name: string;
  description?: string;
  displayOrder: number;
}

interface SprintFixture {
  key: string;
  workspace: string;
  title: string;
  startOffsetDays: number;
  endOffsetDays: number;
  isActive?: boolean;
}

interface TaskFixture {
  key: string;
  board: string;
  title: string;
  description?: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED";
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startOffsetDays?: number;
  dueOffsetDays: number;
  points?: number;
  author: string;
  parentTask?: string;
  assignees?: string[];
  tags?: string[];
  sprints?: string[];
}

interface CommentFixture {
  task: string;
  user: string;
  text: string;
}

interface AttachmentFixture {
  task: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface ActivityFixture {
  task: string;
  user: string;
  type:
    | "CREATED"
    | "STATUS_CHANGED"
    | "PRIORITY_CHANGED"
    | "ASSIGNED"
    | "UNASSIGNED"
    | "MOVED_TO_SPRINT"
    | "REMOVED_FROM_SPRINT"
    | "EDITED"
    | "COMMENTED"
    | "ATTACHMENT_ADDED";
  field?: string;
  oldValue?: string;
  newValue?: string;
}

interface NotificationFixture {
  user: string;
  task?: string;
  type: "TASK_ASSIGNED" | "TASK_STATUS_CHANGED" | "TASK_COMMENTED" | "TASK_UPDATED" | "WORKSPACE_INVITATION";
  message: string;
  isRead: boolean;
}

interface ApplicationFixture {
  workspace: string;
  user: string;
  message?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface InvitationFixture {
  workspace: string;
  createdBy: string;
  expiresInDays: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function loadJson<T>(name: string): T {
  const file = path.join(__dirname, "seed-data", `${name}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function resolvePermissions(p: RoleFixture["permissions"]): number {
  if (p === "ALL") return ALL_PERMISSIONS;
  if (p === "DEFAULT_MEMBER") return DEFAULT_MEMBER_PERMISSIONS;
  return p;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function mustGet<T>(map: Map<string, T>, key: string, label: string): T {
  const v = map.get(key);
  if (v === undefined) throw new Error(`Unknown ${label} key: ${key}`);
  return v;
}

// ── Main ───────────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
    throw new Error(
      `Refusing to seed: DATABASE_URL does not point to localhost.\n` +
        `Current: ${url.replace(/\/\/[^@]+@/, "//***@")}`,
    );
  }

  console.log("🌱 Seeding dev database from JSON fixtures...");

  // Load fixtures
  const userFixtures = loadJson<UserFixture[]>("users");
  const workspaceFixtures = loadJson<WorkspaceFixture[]>("workspaces");
  const tagFixtures = loadJson<TagFixture[]>("tags");
  const boardFixtures = loadJson<BoardFixture[]>("boards");
  const sprintFixtures = loadJson<SprintFixture[]>("sprints");
  const taskFixtures = loadJson<TaskFixture[]>("tasks");
  const commentFixtures = loadJson<CommentFixture[]>("comments");
  const attachmentFixtures = loadJson<AttachmentFixture[]>("attachments");
  const activityFixtures = loadJson<ActivityFixture[]>("activities");
  const notificationFixtures = loadJson<NotificationFixture[]>("notifications");
  const applicationFixtures = loadJson<ApplicationFixture[]>("applications");
  const invitationFixtures = loadJson<InvitationFixture[]>("invitations");

  // ── Clear existing data (order matters due to FKs) ───────────────────────
  console.log("  Clearing existing data...");
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceInvitation.deleteMany();
  await prisma.workspaceApplication.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.role.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ────────────────────────────────────────────────────────────────
  const password = await bcrypt.hash("password123", 10);
  const userIds = new Map<string, string>();

  for (const u of userFixtures) {
    const created = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password,
        emailVerified: new Date(),
      },
    });
    userIds.set(u.key, created.id);
  }
  console.log(`  ✓ ${userFixtures.length} users (password: "password123")`);

  // ── Workspaces + roles + members ─────────────────────────────────────────
  const workspaceIds = new Map<string, string>();
  const roleIds = new Map<string, string>(); // "wsKey:roleKey" → id

  for (const w of workspaceFixtures) {
    const createdBy = mustGet(userIds, w.createdBy, "user");

    const created = await prisma.workspace.create({
      data: {
        name: w.name,
        description: w.description,
        joinPolicy: w.joinPolicy,
        createdById: createdBy,
        roles: {
          create: w.roles.map((r) => ({
            name: r.name,
            color: r.color,
            permissions: resolvePermissions(r.permissions),
          })),
        },
      },
      include: { roles: true },
    });
    workspaceIds.set(w.key, created.id);

    for (const roleFixture of w.roles) {
      const dbRole = created.roles.find((r) => r.name === roleFixture.name);
      if (!dbRole) throw new Error(`Role not created: ${roleFixture.name}`);
      roleIds.set(`${w.key}:${roleFixture.key}`, dbRole.id);
    }

    for (const m of w.members) {
      const userId = mustGet(userIds, m.user, "user");
      const roleId = mustGet(roleIds, `${w.key}:${m.role}`, "role");

      await prisma.workspaceMember.create({
        data: { userId, workspaceId: created.id, roleId },
      });
    }
  }
  console.log(`  ✓ ${workspaceFixtures.length} workspace(s) with roles & members`);

  // ── Tags ─────────────────────────────────────────────────────────────────
  const tagIds = new Map<string, string>();
  for (const t of tagFixtures) {
    const workspaceId = mustGet(workspaceIds, t.workspace, "workspace");
    const created = await prisma.tag.create({
      data: { name: t.name, color: t.color, workspaceId },
    });
    tagIds.set(t.key, created.id);
  }

  // ── Boards ───────────────────────────────────────────────────────────────
  const boardIds = new Map<string, string>();
  for (const b of boardFixtures) {
    const workspaceId = mustGet(workspaceIds, b.workspace, "workspace");
    const created = await prisma.board.create({
      data: {
        name: b.name,
        description: b.description,
        displayOrder: b.displayOrder,
        workspaceId,
      },
    });
    boardIds.set(b.key, created.id);
  }
  console.log(`  ✓ ${boardFixtures.length} boards, ${tagFixtures.length} tags`);

  // ── Sprints ──────────────────────────────────────────────────────────────
  const sprintIds = new Map<string, string>();
  for (const s of sprintFixtures) {
    const workspaceId = mustGet(workspaceIds, s.workspace, "workspace");
    const created = await prisma.sprint.create({
      data: {
        title: s.title,
        startDate: daysFromNow(s.startOffsetDays),
        endDate: daysFromNow(s.endOffsetDays),
        isActive: s.isActive !== undefined ? s.isActive : true,
        workspaceId,
      },
    });
    sprintIds.set(s.key, created.id);
  }

  // ── Tasks (two passes so parent tasks can reference siblings) ────────────
  const taskIds = new Map<string, string>();

  // Pass 1: create all tasks without parentTaskId
  for (const t of taskFixtures) {
    const boardId = mustGet(boardIds, t.board, "board");
    const authorId = mustGet(userIds, t.author, "user");

    const assigneeIds = (t.assignees ?? []).map((key) => ({
      id: mustGet(userIds, key, "user"),
    }));

    const tagConnections = (t.tags ?? []).map((key) => ({
      id: mustGet(tagIds, key, "tag"),
    }));

    const sprintConnections = (t.sprints ?? []).map((key) => ({
      id: mustGet(sprintIds, key, "sprint"),
    }));

    const created = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        startDate: t.startOffsetDays != null ? daysFromNow(t.startOffsetDays) : null,
        dueDate: daysFromNow(t.dueOffsetDays),
        points: t.points,
        boardId,
        authorId,
        assignees: assigneeIds.length ? { connect: assigneeIds } : undefined,
        tags: tagConnections.length ? { connect: tagConnections } : undefined,
        sprints: sprintConnections.length ? { connect: sprintConnections } : undefined,
      },
    });
    taskIds.set(t.key, created.id);
  }

  // Pass 2: wire up parentTaskId
  let subtaskCount = 0;
  for (const t of taskFixtures) {
    if (!t.parentTask) continue;
    const childId = mustGet(taskIds, t.key, "task");
    const parentId = mustGet(taskIds, t.parentTask, "task");
    await prisma.task.update({
      where: { id: childId },
      data: { parentTaskId: parentId },
    });
    subtaskCount++;
  }
  console.log(`  ✓ ${taskFixtures.length} tasks (${subtaskCount} subtasks), ${sprintFixtures.length} sprint(s)`);

  // ── Comments ─────────────────────────────────────────────────────────────
  for (const c of commentFixtures) {
    await prisma.comment.create({
      data: {
        text: c.text,
        taskId: mustGet(taskIds, c.task, "task"),
        userId: mustGet(userIds, c.user, "user"),
      },
    });
  }

  // ── Attachments ──────────────────────────────────────────────────────────
  for (const a of attachmentFixtures) {
    await prisma.attachment.create({
      data: {
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        taskId: mustGet(taskIds, a.task, "task"),
        uploadedById: mustGet(userIds, a.uploadedBy, "user"),
      },
    });
  }

  // ── Activities ───────────────────────────────────────────────────────────
  for (const a of activityFixtures) {
    await prisma.activity.create({
      data: {
        type: a.type,
        field: a.field,
        oldValue: a.oldValue,
        newValue: a.newValue,
        taskId: mustGet(taskIds, a.task, "task"),
        userId: mustGet(userIds, a.user, "user"),
      },
    });
  }

  // ── Notifications ────────────────────────────────────────────────────────
  for (const n of notificationFixtures) {
    await prisma.notification.create({
      data: {
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        userId: mustGet(userIds, n.user, "user"),
        taskId: n.task ? mustGet(taskIds, n.task, "task") : null,
      },
    });
  }
  console.log(
    `  ✓ ${commentFixtures.length} comments, ${attachmentFixtures.length} attachments, ${activityFixtures.length} activities, ${notificationFixtures.length} notifications`,
  );

  // ── Applications ─────────────────────────────────────────────────────────
  for (const app of applicationFixtures) {
    await prisma.workspaceApplication.create({
      data: {
        message: app.message,
        status: app.status,
        userId: mustGet(userIds, app.user, "user"),
        workspaceId: mustGet(workspaceIds, app.workspace, "workspace"),
      },
    });
  }

  // ── Invitations ──────────────────────────────────────────────────────────
  for (const inv of invitationFixtures) {
    await prisma.workspaceInvitation.create({
      data: {
        workspaceId: mustGet(workspaceIds, inv.workspace, "workspace"),
        createdById: mustGet(userIds, inv.createdBy, "user"),
        expiresAt: daysFromNow(inv.expiresInDays),
      },
    });
  }
  console.log(`  ✓ ${applicationFixtures.length} applications, ${invitationFixtures.length} invitations`);

  console.log("\n🎉 Seed complete. Sign in with:");
  for (const u of userFixtures) {
    console.log(`   ${u.email} / password123  (${u.name})`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
