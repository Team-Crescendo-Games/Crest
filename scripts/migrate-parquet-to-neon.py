"""
Migration script: Parquet export (old schema) → SQL inserts (new schema)

USAGE:
  1. Install dependencies:
       pip install pandas pyarrow

  2. Unzip your export so the folder structure looks like:
       data/
         public.User/
           1/part-00000-*.parquet
         public.Workspace/
           1/part-00000-*.parquet
         public.Task/
           ...

  3. Run:
       python scripts/migrate-parquet-to-neon.py --input ./data --output migration.sql

  4. Make sure your Neon DB has the new schema:
       npx prisma migrate dev --name init

  5. Run the output against Neon:
       psql "your_neon_connection_string" -f migration.sql
"""

import argparse
import os
import uuid
from pathlib import Path

import pandas as pd


def gen_cuid():
    """Generate a cuid-like ID."""
    return "c" + uuid.uuid4().hex


def read_table(base_path: str, table_name: str) -> pd.DataFrame:
    """Read all parquet files for a given table."""
    table_dir = os.path.join(base_path, f"public.{table_name}")
    if not os.path.exists(table_dir):
        print(f"  ⚠ Table {table_name} not found at {table_dir}, skipping")
        return pd.DataFrame()

    parquet_files = []
    for root, dirs, files in os.walk(table_dir):
        for f in files:
            if f.endswith(".parquet"):
                parquet_files.append(os.path.join(root, f))

    if not parquet_files:
        print(f"  ⚠ No parquet files found for {table_name}")
        return pd.DataFrame()

    dfs = [pd.read_parquet(f) for f in parquet_files]
    df = pd.concat(dfs, ignore_index=True)
    print(f"  ✓ {table_name}: {len(df)} rows")
    return df


def sql_val(val):
    """Format a Python value as a SQL literal."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return "NULL"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(int(val)) if float(val).is_integer() else str(val)
    if isinstance(val, pd.Timestamp):
        return f"'{val.isoformat()}'"
    s = str(val).replace("'", "''")
    return f"'{s}'"


def main():
    parser = argparse.ArgumentParser(description="Migrate parquet data to new Crest schema")
    parser.add_argument("--input", required=True, help="Path to unzipped parquet export folder")
    parser.add_argument("--output", default="migration.sql", help="Output SQL file")
    args = parser.parse_args()

    base = args.input
    out_lines = []

    def emit(line):
        out_lines.append(line)

    emit("-- Auto-generated migration from old Crest parquet export")
    emit("-- Run against your Neon database AFTER running: npx prisma migrate dev")
    emit("BEGIN;")
    emit("")

    # ── Read all tables ──────────────────────────────────────────────────
    print("Reading parquet files...")
    users = read_table(base, "User")
    workspaces = read_table(base, "Workspace")
    roles = read_table(base, "Role")
    members = read_table(base, "WorkspaceMember")
    applications = read_table(base, "WorkspaceApplication")
    invitations = read_table(base, "WorkspaceInvitation")
    boards = read_table(base, "Board")
    tasks = read_table(base, "Task")
    tags = read_table(base, "Tag")
    task_tags = read_table(base, "TaskTag")
    task_assignments = read_table(base, "TaskAssignment")
    sprints = read_table(base, "Sprint")
    sprint_tasks = read_table(base, "SprintTask")
    comments = read_table(base, "Comment")
    activities = read_table(base, "Activity")
    notifications = read_table(base, "Notification")
    attachments = read_table(base, "Attachment")

    # ── Build ID maps ────────────────────────────────────────────────────
    print("\nBuilding ID maps...")
    id_maps = {}

    def build_map(df, table, id_col):
        m = {}
        if df.empty:
            id_maps[table] = m
            return m
        for old_id in df[id_col].unique():
            m[int(old_id)] = gen_cuid()
        id_maps[table] = m
        return m

    user_map = build_map(users, "User", "userId")
    ws_map = build_map(workspaces, "Workspace", "id")
    role_map = build_map(roles, "Role", "id")
    member_map = build_map(members, "WorkspaceMember", "id")
    app_map = build_map(applications, "WorkspaceApplication", "id")
    board_map = build_map(boards, "Board", "id")
    task_map = build_map(tasks, "Task", "id")
    tag_map = build_map(tags, "Tag", "id")
    sprint_map = build_map(sprints, "Sprint", "id")
    comment_map = build_map(comments, "Comment", "id")
    activity_map = build_map(activities, "Activity", "id")
    notif_map = build_map(notifications, "Notification", "id")
    attach_map = build_map(attachments, "Attachment", "id")

    def get_new_id(table, old_id):
        if old_id is None or (isinstance(old_id, float) and pd.isna(old_id)):
            return None
        return id_maps.get(table, {}).get(int(old_id))

    # ── Enum mappings ────────────────────────────────────────────────────
    JOIN_POLICY = {0: "INVITE_ONLY", 1: "APPLY_TO_JOIN", 2: "OPEN"}
    APP_STATUS = {0: "PENDING", 1: "APPROVED", 2: "REJECTED"}
    TASK_STATUS = {0: "NOT_STARTED", 1: "IN_PROGRESS", 2: "IN_REVIEW", 3: "COMPLETED"}
    ACTIVITY_TYPE = {0: "CREATED", 1: "STATUS_CHANGED", 2: "EDITED"}
    NOTIF_TYPE = {0: "TASK_COMMENTED", 1: "TASK_UPDATED", 2: "TASK_ASSIGNED"}

    # ── Users ────────────────────────────────────────────────────────────
    emit("-- ======= USERS =======")
    emit("-- Users will need to re-register. This creates placeholder accounts.")
    emit("-- Using DO UPDATE to ensure our generated IDs are used consistently.")
    for _, u in users.iterrows():
        new_id = user_map[int(u["userId"])]
        name = u.get("fullName") or u.get("username") or "Unknown"
        email = u.get("email") or f'{u.get("username", "user")}@placeholder.local'
        emit(
            f'INSERT INTO "User" (id, name, email, password, "createdAt", "updatedAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(name)}, {sql_val(email)}, NULL, NOW(), NOW()) "
            f'ON CONFLICT (email) DO UPDATE SET id = {sql_val(new_id)}, name = {sql_val(name)};'
        )
    emit("")

    # ── Workspaces ───────────────────────────────────────────────────────
    emit("-- ======= WORKSPACES =======")
    for _, w in workspaces.iterrows():
        new_id = ws_map[int(w["id"])]
        jp = JOIN_POLICY.get(int(w.get("joinPolicy", 0)), "INVITE_ONLY")
        created_by = get_new_id("User", w.get("createdById"))
        emit(
            f'INSERT INTO "Workspace" (id, name, description, "joinPolicy", "createdAt", "updatedAt", "createdById") '
            f"VALUES ({sql_val(new_id)}, {sql_val(w['name'])}, {sql_val(w.get('description'))}, "
            f"{sql_val(jp)}, NOW(), NOW(), {sql_val(created_by)});"
        )
    emit("")

    # ── Roles ────────────────────────────────────────────────────────────
    emit("-- ======= ROLES =======")
    for _, r in roles.iterrows():
        new_id = role_map[int(r["id"])]
        ws_id = get_new_id("Workspace", r["workspaceId"])
        if not ws_id:
            continue
        emit(
            f'INSERT INTO "Role" (id, name, color, permissions, "workspaceId") '
            f"VALUES ({sql_val(new_id)}, {sql_val(r['name'])}, {sql_val(r.get('color', '#6B7280'))}, "
            f"{int(r.get('permissions', 0))}, {sql_val(ws_id)});"
        )
    emit("")

    # ── Workspace Members ────────────────────────────────────────────────
    emit("-- ======= WORKSPACE MEMBERS =======")
    for _, m in members.iterrows():
        new_id = member_map[int(m["id"])]
        u_id = get_new_id("User", m["userId"])
        ws_id = get_new_id("Workspace", m["workspaceId"])
        r_id = get_new_id("Role", m["roleId"])
        if not all([u_id, ws_id, r_id]):
            continue
        emit(
            f'INSERT INTO "WorkspaceMember" (id, "userId", "workspaceId", "roleId", "joinedAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(u_id)}, {sql_val(ws_id)}, {sql_val(r_id)}, NOW());"
        )
    emit("")

    # ── Boards ───────────────────────────────────────────────────────────
    emit("-- ======= BOARDS =======")
    for _, b in boards.iterrows():
        new_id = board_map[int(b["id"])]
        ws_id = get_new_id("Workspace", b["workspaceId"])
        if not ws_id:
            continue
        emit(
            f'INSERT INTO "Board" (id, name, description, "isActive", "displayOrder", "workspaceId", "createdAt", "updatedAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(b['name'])}, {sql_val(b.get('description'))}, "
            f"{sql_val(bool(b.get('isActive', True)))}, {int(b.get('displayOrder', 0))}, "
            f"{sql_val(ws_id)}, NOW(), NOW());"
        )
    emit("")

    # ── Tasks (without parentTaskId first, then update) ──────────────────
    emit("-- ======= TASKS =======")
    for _, t in tasks.iterrows():
        new_id = task_map[int(t["id"])]
        b_id = get_new_id("Board", t["boardId"])
        a_id = get_new_id("User", t["authorUserId"])
        if not all([b_id, a_id]):
            continue
        status = TASK_STATUS.get(int(t.get("status", 0) or 0), "NOT_STARTED")
        priority = t.get("priority") or "NONE"
        # Validate priority is a valid enum value
        if priority not in ("NONE", "LOW", "MEDIUM", "HIGH", "URGENT"):
            priority = "NONE"
        start_date = sql_val(t.get("startDate"))
        due_date = sql_val(t.get("dueDate"))
        points = int(t["points"]) if pd.notna(t.get("points")) else None
        emit(
            f'INSERT INTO "Task" (id, title, description, status, priority, "startDate", "dueDate", '
            f'points, "boardId", "authorId", "createdAt", "updatedAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(t['title'])}, {sql_val(t.get('description'))}, "
            f"{sql_val(status)}, {sql_val(priority)}, {start_date}, {due_date}, "
            f"{sql_val(points)}, {sql_val(b_id)}, {sql_val(a_id)}, NOW(), NOW());"
        )
    emit("")

    # Update parent task references
    emit("-- ======= TASK PARENT REFERENCES =======")
    for _, t in tasks.iterrows():
        parent_old = t.get("parentTaskId")
        if pd.notna(parent_old):
            new_id = task_map[int(t["id"])]
            parent_new = get_new_id("Task", parent_old)
            if parent_new:
                emit(
                    f'UPDATE "Task" SET "parentTaskId" = {sql_val(parent_new)} '
                    f"WHERE id = {sql_val(new_id)};"
                )
    emit("")

    # ── Tags ─────────────────────────────────────────────────────────────
    emit("-- ======= TAGS =======")
    for _, tg in tags.iterrows():
        new_id = tag_map[int(tg["id"])]
        ws_id = get_new_id("Workspace", tg["workspaceId"])
        if not ws_id:
            continue
        emit(
            f'INSERT INTO "Tag" (id, name, color, "workspaceId") '
            f"VALUES ({sql_val(new_id)}, {sql_val(tg['name'])}, {sql_val(tg.get('color'))}, {sql_val(ws_id)});"
        )
    emit("")

    # ── Task-Tag relations ───────────────────────────────────────────────
    emit('-- ======= TASK-TAG RELATIONS (_TaskTags: A=Tag, B=Task) =======')
    for _, tt in task_tags.iterrows():
        tag_new = get_new_id("Tag", tt["tagId"])
        task_new = get_new_id("Task", tt["taskId"])
        if tag_new and task_new:
            emit(f'INSERT INTO "_TaskTags" ("A", "B") VALUES ({sql_val(tag_new)}, {sql_val(task_new)});')
    emit("")

    # ── Task Assignees ───────────────────────────────────────────────────
    emit('-- ======= TASK ASSIGNEES (_TaskAssignees: A=Task, B=User) =======')
    for _, ta in task_assignments.iterrows():
        task_new = get_new_id("Task", ta["taskId"])
        user_new = get_new_id("User", ta["userId"])
        if task_new and user_new:
            emit(f'INSERT INTO "_TaskAssignees" ("A", "B") VALUES ({sql_val(task_new)}, {sql_val(user_new)});')
    emit("")

    # ── Sprints ──────────────────────────────────────────────────────────
    emit("-- ======= SPRINTS =======")
    for _, s in sprints.iterrows():
        new_id = sprint_map[int(s["id"])]
        ws_id = get_new_id("Workspace", s["workspaceId"])
        if not ws_id:
            continue
        emit(
            f'INSERT INTO "Sprint" (id, title, "startDate", "endDate", "isActive", "workspaceId", "createdAt", "updatedAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(s['title'])}, {sql_val(s.get('startDate'))}, "
            f"{sql_val(s.get('dueDate'))}, {sql_val(bool(s.get('isActive', True)))}, "
            f"{sql_val(ws_id)}, NOW(), NOW());"
        )
    emit("")

    # ── Sprint-Task relations ────────────────────────────────────────────
    emit('-- ======= SPRINT-TASK RELATIONS (_SprintTasks: A=Sprint, B=Task) =======')
    for _, st in sprint_tasks.iterrows():
        sprint_new = get_new_id("Sprint", st["sprintId"])
        task_new = get_new_id("Task", st["taskId"])
        if sprint_new and task_new:
            emit(f'INSERT INTO "_SprintTasks" ("A", "B") VALUES ({sql_val(sprint_new)}, {sql_val(task_new)});')
    emit("")

    # ── Comments ─────────────────────────────────────────────────────────
    emit("-- ======= COMMENTS =======")
    for _, c in comments.iterrows():
        new_id = comment_map[int(c["id"])]
        task_new = get_new_id("Task", c["taskId"])
        user_new = get_new_id("User", c["userId"])
        if not all([task_new, user_new]):
            continue
        created = sql_val(c.get("createdAt"))
        emit(
            f'INSERT INTO "Comment" (id, text, "taskId", "userId", "createdAt", "updatedAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(c['text'])}, {sql_val(task_new)}, "
            f"{sql_val(user_new)}, {created}, {created});"
        )
    emit("")

    # ── Activities ────────────────────────────────────────────────────────
    emit("-- ======= ACTIVITIES =======")
    for _, a in activities.iterrows():
        new_id = activity_map[int(a["id"])]
        task_new = get_new_id("Task", a["taskId"])
        user_new = get_new_id("User", a["userId"])
        if not all([task_new, user_new]):
            continue
        atype = ACTIVITY_TYPE.get(int(a.get("activityType", 2)), "EDITED")
        emit(
            f'INSERT INTO "Activity" (id, type, field, "oldValue", "newValue", "taskId", "userId", "createdAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(atype)}, {sql_val(a.get('editField'))}, "
            f"{sql_val(a.get('previousStatus'))}, {sql_val(a.get('newStatus'))}, "
            f"{sql_val(task_new)}, {sql_val(user_new)}, {sql_val(a.get('createdAt'))});"
        )
    emit("")

    # ── Notifications ────────────────────────────────────────────────────
    emit("-- ======= NOTIFICATIONS =======")
    for _, n in notifications.iterrows():
        new_id = notif_map[int(n["id"])]
        user_new = get_new_id("User", n["userId"])
        task_new = get_new_id("Task", n.get("taskId"))
        if not user_new:
            continue
        ntype = NOTIF_TYPE.get(int(n.get("type", 1)), "TASK_UPDATED")
        emit(
            f'INSERT INTO "Notification" (id, type, message, "isRead", "userId", "taskId", "createdAt") '
            f"VALUES ({sql_val(new_id)}, {sql_val(ntype)}, {sql_val(n.get('message') or '')}, "
            f"{sql_val(bool(n.get('isRead', False)))}, {sql_val(user_new)}, {sql_val(task_new)}, "
            f"{sql_val(n.get('createdAt'))});"
        )
    emit("")

    emit("COMMIT;")
    emit("")
    emit("-- ======= DONE =======")
    emit("-- Users will need to re-register with email + password.")
    emit("-- Attachments skipped (old schema only had fileExt, no actual file URLs).")
    emit("-- CommentReactions skipped (not in new schema).")

    # Write output
    output_path = args.output
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))

    print(f"\n✓ Migration SQL written to {output_path}")
    print(f"  Total lines: {len(out_lines)}")
    print(f"\nNext steps:")
    print(f"  1. Ensure your Neon DB has the new schema: npx prisma migrate dev")
    print(f"  2. Run: psql \"your_neon_connection_string\" -f {output_path}")


if __name__ == "__main__":
    main()
