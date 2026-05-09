# Crest

A modern project management web app built with Next.js. Crest organizes work around **Workspaces → Boards → Tasks**, with **Sprints** for time-based planning, **Flow View** for visualizing task dependencies as a graph, and rich activity tracking across every interaction.

![Crest](public/ReadmeImg.png)

![Dependency graph](public/DependencyGraph.png)

---

## Motivation — from Team Crescendo

> We're **Team Crescendo**, and we built Crest for ourselves first.
>
> We were tired of pay-to-win project software. Trello, Jira, and the rest take the features small teams genuinely need — proper roles, dependency tracking, a real activity log — and lock them behind seat counts, premium tiers, and per-user fees that punish you for growing. Small teams already have the least time and the least money. They shouldn't have to budget around a tracker.
>
> So we built the tool we wished we had. Crest is for the two-person side project that turns into a five-person company, for the student club shipping a prototype before finals, for the open-source group coordinating across timezones. Move fast. Own your data. Self-host it on a $5 box and keep every feature.
>
> If Crest helps your team ship something you're proud of, that's the whole point.
>
> — Team Crescendo

---

## What Crest Is

Crest is a self-hostable, opinionated alternative to tools like Jira and Linear, designed for small-to-medium teams that want fast navigation, a clean keyboard-friendly UI, and full control over their data.

**Core ideas:**

- **Workspaces** are isolated environments — boards, sprints, members, and roles all live inside one. A user can belong to many.
- **Boards** are ordered collections of tasks (kanban, list, or flow view).
- **Tasks** support rich descriptions (markdown), parent/subtask hierarchies, dependency graphs, multi-assignee, tags, story points, due dates, attachments, and a per-field activity log.
- **Sprints** are time-boxed planning units that link to tasks many-to-many; a single task can span multiple sprints.
- **Flow View** renders task dependency graphs interactively so blockers and critical paths are visible at a glance.
- **Roles** are bitfield-based permissions, customizable per workspace, evaluated on every server action.
- **Notifications** drive real-time awareness of mentions, assignments, and status changes.

---

## Tech Stack

| Layer        | Technology                                                          |
| ------------ | ------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack, React Server Components)         |
| Runtime      | React 19                                                            |
| Database     | PostgreSQL via Prisma 7 (with `@prisma/adapter-pg`)                 |
| Auth         | NextAuth v5 (beta) — JWT sessions, credentials provider, bcrypt 12  |
| Storage      | AWS S3 (or any S3-compatible service, e.g. MinIO, R2)               |
| Styling      | Tailwind CSS v4 (`@tailwindcss/postcss`)                            |
| Theming      | `next-themes` (light/dark)                                          |
| Charts       | Recharts 3                                                          |
| Drag & Drop  | `@hello-pangea/dnd`                                                 |
| Markdown     | `react-markdown`                                                    |
| Icons        | `lucide-react`                                                      |
| Tooling      | TypeScript 5, ESLint 9 (`eslint-config-next`), `tsx` for seed       |

---

## Data Model

```
User
 └── WorkspaceMember (many-to-many with Workspace, via Role)
      └── Workspace
           ├── Role            (bitfield permissions per workspace)
           ├── Board           (ordered; contains Tasks)
           │    └── Task       (status, priority, assignees, tags, points, due date)
           │         ├── Comment
           │         ├── Attachment   (S3-backed, presigned upload)
           │         ├── Activity     (audit log; per-field diffs)
           │         ├── Notification
           │         ├── Subtasks     (self-referential parent/child)
           │         └── Dependencies (task-to-task graph; powers Flow View)
           ├── Sprint          (time-boxed; many-to-many with Tasks)
           ├── Tag             (workspace-scoped colored labels)
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
  api/                      # Route handlers (REST-style)
    auth/                   # register, set-password, NextAuth catchall
    attachments/            # CRUD + S3 presign
    notifications/          # paginated feed, mark read
    profile-picture/        # presign + serve
  w/                        # Workspace-scoped pages
    [workspaceId]/
      page.tsx              # Workspace overview
      b/[boardId]/          # Board view
        page.tsx            # Kanban / list / flow
        t/[taskId]/page.tsx # Task detail (edit form, comments, activity)
      s/[sprintId]/page.tsx # Sprint detail
      team/                 # Members + member profiles
  t/[taskId]/page.tsx       # Direct task permalink (resolves workspace/board)
  profile/                  # Personal profile
  sign-in/ sign-up/ set-password/ invite/
  layout.tsx page.tsx       # Root layout + landing

components/                 # UI components (mostly client-side)
  tasks/                    # Task forms, kanban, flow view, activity log, etc.
  sprints/                  # Sprint timeline + views
  workspace/                # Attachments, subtasks, parent-task panels
  common/                   # Shared primitives (UserAvatar, etc.)

lib/
  auth.ts                   # NextAuth config
  prisma.ts                 # Prisma client singleton
  permissions.ts            # Bitfield helpers (getEffectivePermissions, hasPermission)
  task-enums.ts             # Status/priority labels, colors, sort utils
  whitelist.ts              # Email allowlist for registration
  s3.ts                     # Presigned URL generation, object deletion
  stage.ts                  # Environment/stage detection
  actions/                  # Server Actions
    task/                   # Modular task actions (core, helpers, relations, index)
    board.ts sprint.ts tag.ts role.ts workspace.ts user.ts metrics.ts
    auth-helpers.ts revalidation-helpers.ts
  validations/              # Zod-style request validators

prisma/
  schema.prisma
  seed.ts
  migrations/
  generated/prisma/         # Non-standard client output location
```

---

## Getting Started — Onboarding Guide

This walks through bringing up a fully working local instance from a clean checkout.

### 1. Prerequisites

| Tool        | Version            | Notes                                              |
| ----------- | ------------------ | -------------------------------------------------- |
| Node.js     | 20+ (22 LTS ideal) | Matches `@types/node` major                        |
| PostgreSQL  | 14+                | Local or Docker; any reachable instance works      |
| S3 endpoint | any                | Real AWS S3, or MinIO / LocalStack for local dev   |

### 2. Clone & install

```bash
git clone <your-fork-url> crest
cd crest
npm install
```

The `postinstall` hook runs `prisma generate`, producing the typed client at `prisma/generated/prisma`.

### 3. Configure environment

Create a `.env.local` file at the repo root:

```env
# ── Required ───────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/crest
AUTH_SECRET=<generate via `openssl rand -base64 32`>
AUTH_URL=http://localhost:3000

# Registration allowlist (comma-separated; @domain.com for wildcards).
# Empty value = registration closed.
ALLOWED_EMAILS="@yourcompany.com,founder@example.com"

# ── S3 / file storage ──────────────────────────────────────
S3_REGION=us-east-1
S3_BUCKET=crest-attachments
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# ── Optional (S3-compatible providers) ─────────────────────
S3_ENDPOINT=http://localhost:9000          # MinIO, R2, etc.
S3_PUBLIC_URL=https://cdn.yourdomain.com   # Override for public asset URLs
```

> **Tip:** for purely local development you can run MinIO via Docker
> (`docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"`)
> and point `S3_ENDPOINT` at `http://localhost:9000`.

### 4. Initialize the database

```bash
npx prisma migrate deploy   # apply existing migrations
npm run db:seed             # optional: demo workspace, users, tasks
```

If you change `prisma/schema.prisma`, use `npx prisma migrate dev --name <change>` during development.

### 5. Run it

```bash
npm run dev      # http://localhost:3000 (Turbopack)
```

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

### 6. First-run flow

1. Visit `/sign-up` — accounts whose email matches `ALLOWED_EMAILS` can register; everyone else is blocked.
2. After sign-in you'll land on `/w` — the workspace picker. Create your first workspace.
3. Inside a workspace:
   - **Boards** (`/w/<id>/b`): create a board, then add tasks. Drag between status columns or open a task for the full edit view.
   - **Sprints** (`/w/<id>/s`): create a sprint, link tasks to it, watch progress on the timeline.
   - **Team** (`/w/<id>/team`): invite members, manage roles, review applications.
4. Open any task and toggle **Flow Mode** to view its dependency graph. Use **Assign to me** under the assignees list to claim a task in one click.

### 7. Deploying

Crest is a standard Next.js app and deploys cleanly to any Node-capable host (Vercel, Fly.io, Railway, your own VPS). Required at runtime:

- Postgres reachable via `DATABASE_URL`
- S3-compatible bucket reachable via the `S3_*` env vars
- `AUTH_SECRET` and `AUTH_URL` set to the production origin

Run `npm run db:migrate` against your production database before each deploy.

---

## Auth Flow

1. Registration is gated by `ALLOWED_EMAILS` — exact emails or `@domain.com` wildcards.
2. Passwords are hashed with bcrypt (cost 12).
3. Sessions are JWT-based; the session callback refreshes `name` and `image` from the DB on every request so profile updates are reflected immediately.
4. The `set-password` flow allows setting a password for accounts that don't have one yet (e.g. invitation-created accounts).

---

## File Attachments

Uploads use a two-step presigned URL flow:

1. Client calls `POST /api/attachments/presign` → gets a short-lived S3 PUT URL.
2. Client uploads directly to S3.
3. Client calls `POST /api/attachments` to save metadata to the DB.

Max file size: **10 MB**. Allowed types: images, PDF, plain text, CSV, JSON, ZIP, Word, Excel.

Profile pictures use the same flow under `/api/profile-picture/*`.

---

## Key Conventions

- All workspace pages are **React Server Components** that fetch data directly via Prisma (often in parallel with `Promise.all`), then pass it to client components.
- Mutations go through **Server Actions** in `lib/actions/` (not API routes), except for file uploads and notifications which use route handlers.
- Permission checks use `getEffectivePermissions()` + `hasPermission()` from `lib/permissions.ts` — always check these before mutating workspace-scoped data.
- The Prisma client output lives at `prisma/generated/prisma` (non-standard) — import from `@/prisma/generated/prisma`.
- Activity log entries must be **specific**: always record the field that changed and the resolved entity name, never a generic "edited this task".
- Note: this app targets **Next.js 16**, which has breaking changes from earlier versions. Consult the docs in `node_modules/next/dist/docs/` before introducing new patterns.
