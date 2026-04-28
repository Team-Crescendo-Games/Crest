# Crest

A project management web app built with Next.js. Organizes work around **Workspaces → Boards → Tasks**, with **Sprints** for time-based planning.

---

## Tech Stack

| Layer       | Technology                                              |
| ----------- | ------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, React 19)                       |
| Database    | PostgreSQL via Prisma 7                                 |
| Auth        | NextAuth v5 (beta) — JWT sessions, credentials provider |
| Storage     | AWS S3 (or S3-compatible, e.g. MinIO)                   |
| Styling     | Tailwind CSS v4                                         |
| Charts      | Recharts                                                |
| Drag & Drop | @hello-pangea/dnd                                       |

---

## Data Model

```
User
 └── WorkspaceMember (many-to-many with Workspace, via Role)
      └── Workspace
           ├── Role            (bitfield permissions per workspace)
           ├── Board           (ordered; contains Tasks)
           │    └── Task       (status, priority, assignees, tags, subtasks)
           │         ├── Comment
           │         ├── Attachment  (S3-backed)
           │         ├── Activity    (audit log)
           │         └── Notification
           ├── Sprint          (time-boxed; links to Tasks many-to-many)
           ├── Tag             (workspace-scoped labels for Tasks)
           ├── WorkspaceInvitation
           └── WorkspaceApplication
```

**Task enums:**

- Status: `NOT_STARTED` → `IN_PROGRESS` → `IN_REVIEW` → `COMPLETED`
- Priority: `NONE | LOW | MEDIUM | HIGH | URGENT`

**Workspace join policies:** `INVITE_ONLY | APPLY_TO_JOIN | OPEN`

**Permissions** are a bitfield on each `Role`:
`CREATE_CONTENT | EDIT_CONTENT | DELETE_CONTENT | INVITE_MEMBERS | MANAGE_ROLES | MANAGE_APPLICATIONS | MANAGE_WORKSPACE`

The workspace creator always has all permissions regardless of role.

---

## Project Structure

```
app/
  api/                  # Route handlers (REST-style)
    auth/               # register, set-password
    attachments/        # CRUD + S3 presign
    notifications/      # paginated feed, mark read
    profile-picture/    # presign + serve
  dashboard/            # Protected pages (require auth)
    page.tsx            # Personal kanban + notifications
    workspaces/
      [workspaceId]/
        page.tsx        # Workspace overview (boards, sprints, tags, roles)
        boards/[boardId]/page.tsx
        sprints/[sprintId]/page.tsx
        team/page.tsx
        settings/page.tsx
  sign-in/ sign-up/ set-password/ invite/

components/             # UI components (mostly client-side)
lib/
  auth.ts               # NextAuth config
  prisma.ts             # Prisma client singleton
  permissions.ts        # Bitfield helpers
  task-enums.ts         # Status/priority labels, colors, sort utils
  whitelist.ts          # Email allowlist for registration
  s3.ts                 # Presigned URL generation, object deletion
  stage.ts              # Environment/stage detection
  actions/              # Next.js Server Actions (board, task, sprint, workspace, etc.)
prisma/
  schema.prisma
  seed.ts
  migrations/
```

---

## Auth Flow

1. Registration is gated by `ALLOWED_EMAILS` — exact emails or `@domain.com` wildcards.
2. Passwords are hashed with bcrypt (cost 12).
3. Sessions are JWT-based; the session callback refreshes `name` and `image` from the DB on every request so profile updates are reflected immediately.
4. The `set-password` flow allows setting a password for accounts that don't have one yet (e.g. OAuth-created accounts).

---

## File Attachments

Uploads use a two-step presigned URL flow:

1. Client calls `POST /api/attachments/presign` → gets a short-lived S3 PUT URL.
2. Client uploads directly to S3.
3. Client calls `POST /api/attachments` to save metadata to the DB.

Max file size: **10 MB**. Allowed types: images, PDF, plain text, CSV, JSON, ZIP, Word, Excel.

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
AUTH_SECRET=<random string>
AUTH_URL=https://yourdomain.com

# Registration allowlist (comma-separated; @domain.com for wildcards)
# Empty = registration closed
ALLOWED_EMAILS="@yourcompany.com,guest@external.com"

# S3 / file storage
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# Optional — for MinIO or custom S3-compatible endpoints
S3_ENDPOINT=http://localhost:9000
S3_PUBLIC_URL=https://cdn.yourdomain.com
```

---

## Getting Started

```bash
npm install
# Set up .env (see above)
npx prisma migrate deploy
npm run db:seed      # optional seed data
npm run dev
```

Prisma client is auto-generated on `npm install` via the `postinstall` script.

---

## Key Conventions

- All dashboard pages are **React Server Components** that fetch data directly via Prisma, then pass it to client components.
- Mutations go through **Server Actions** in `lib/actions/` (not API routes), except for file uploads and notifications which use route handlers.
- Permission checks use `getEffectivePermissions()` + `hasPermission()` from `lib/permissions.ts` — always check these before mutating workspace-scoped data.
- The Prisma client output is at `prisma/generated/prisma` (non-standard location — import from `@/prisma/generated/prisma`).
