import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  joinPolicy?: number; // 0=INVITE_ONLY, 1=APPLY_TO_JOIN, 2=DISCOVERABLE
  iconExt?: string;
  headerExt?: string;
  createdById?: number;
}

export interface AdminWorkspace extends Workspace {
  createdBy?: User;
  _count?: { members: number };
}

export interface DiscoverableWorkspace extends Workspace {
  memberCount: number;
  hasPendingApplication: boolean;
}

export interface WorkspaceApplication {
  id: number;
  userId: number;
  workspaceId: number;
  message?: string;
  status: number; // 0=PENDING, 1=APPROVED, 2=REJECTED
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Role {
  id: number;
  name: string;
  color: string;
  permissions: number;
  workspaceId: number;
}

export interface WorkspaceMember {
  id: number;
  userId: number;
  workspaceId: number;
  roleId: number;
  role?: Role;
  user?: User;
}

export interface Board {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
  workspaceId: number;
}

export enum Priority {
  Urgent = "Urgent",
  High = "High",
  Medium = "Medium",
  Low = "Low",
  Backlog = "Backlog",
}

export enum ActivityType {
  CREATE_TASK = 0,
  MOVE_TASK = 1,
  EDIT_TASK = 2,
}

export enum NotificationType {
  MENTION = 0,
  NEAR_OVERDUE = 1,
  OVERDUE = 2,
  TASK_EDITED = 3,
  TASK_REASSIGNED = 4,
}

export enum NotificationSeverity {
  INFO = 0,
  MEDIUM = 1,
  CRITICAL = 2,
}

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  severity: NotificationSeverity;
  message?: string;
  isRead: boolean;
  createdAt: string;
  taskId?: number;
  commentId?: number;
  activityId?: number;
  task?: {
    id: number;
    title: string;
  };
  comment?: {
    id: number;
    text: string;
  };
  activity?: {
    id: number;
    activityType: number;
    editField?: string;
  };
}

export interface UnreadCountResponse {
  count: number;
}

export interface Activity {
  id: number;
  taskId: number;
  userId: number;
  activityType: number;
  previousStatus?: string | null;
  newStatus?: string | null;
  editField?: string | null;
  createdAt: string;
  user: {
    userId: number;
    username: string;
    fullName?: string;
  };
}

export enum Status {
  InputQueue = "Input Queue",
  WorkInProgress = "Work In Progress",
  Review = "Review",
  Done = "Done",
}

export interface User {
  userId?: number;
  username: string;
  fullName?: string;
  email: string;
  profilePictureExt?: string;
  cognitoId?: string;
}

export const getUserProfileS3Key = (userId: number, ext: string) =>
  `users/${userId}/profile.${ext}`;

export interface Attachment {
  id: number;
  fileName: string;
  fileExt: string;
  taskId: number;
  uploadedById: number;
}

export const getAttachmentS3Key = (
  taskId: number,
  attachmentId: number,
  fileExt: string,
) => `tasks/${taskId}/attachments/${attachmentId}.${fileExt}`;

export interface Comment {
  id: number;
  text: string;
  taskId: number;
  userId: number;
  createdAt?: string;
  isResolved?: boolean;
  user?: User;
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: number;
  emoji: string;
  commentId: number;
  userId: number;
  user?: { userId: number; username: string };
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  users: { userId: number; username: string }[];
  reactedByCurrentUser: boolean;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  workspaceId: number;
}

export interface TaskTag {
  id: number;
  taskId: number;
  tagId: number;
  tag: Tag;
}

export interface TaskAssignmentWithUser {
  id: number;
  userId: number;
  taskId: number;
  user: {
    userId: number;
    username: string;
    fullName?: string;
    profilePictureExt?: string;
  };
}

export interface SubtaskSummary {
  id: number;
  title: string;
  status?: string;
  priority?: string;
  taskAssignments?: TaskAssignmentWithUser[];
}

export interface ParentTaskSummary {
  id: number;
  title: string;
}

export interface SprintSummary {
  id: number;
  title: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  startDate?: string;
  dueDate?: string;
  points?: number;
  boardId: number;
  authorUserId?: number;

  author?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  taskTags?: TaskTag[];
  taskAssignments?: TaskAssignmentWithUser[];
  subtasks?: SubtaskSummary[];
  parentTask?: ParentTaskSummary | null;
  sprints?: SprintSummary[];
  activities?: Activity[];
}

export interface Sprint {
  id: number;
  title: string;
  startDate?: string;
  dueDate?: string;
  isActive?: boolean;
  workspaceId: number;
  tasks?: Task[];
  _count?: { sprintTasks: number };
}

export interface SearchResults {
  tasks?: Task[];
  boards?: Board[];
  users?: User[];
  sprints?: Sprint[];
}

export interface PointsDataPoint {
  date: string;
  points: number;
  label: string;
}

export interface PointsAnalyticsParams {
  userId: number;
  workspaceId: number;
  groupBy: "week" | "month" | "year";
  startDate: string;
  endDate: string;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { accessToken } = session.tokens ?? {};
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: [
    "Workspaces",
    "WorkspaceMembers",
    "Boards",
    "Tasks",
    "Users",
    "Tags",
    "Sprints",
    "Activities",
    "Notifications",
    "Analytics",
    "Roles",
    "WorkspaceApplications",
  ],
  endpoints: (build) => ({
    // --- WORKSPACES ---
    adminGetAllWorkspaces: build.query<AdminWorkspace[], void>({
      query: () => "workspaces/admin/all",
      providesTags: ["Workspaces"],
    }),
    adminUpdateWorkspace: build.mutation<
      Workspace,
      { workspaceId: number; name?: string; description?: string; joinPolicy?: number }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/admin/${workspaceId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Workspaces"],
    }),
    adminDeleteWorkspace: build.mutation<void, number>({
      query: (workspaceId) => ({
        url: `workspaces/admin/${workspaceId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Workspaces"],
    }),
    getWorkspaces: build.query<Workspace[], number>({
      query: (userId) => `workspaces?userId=${userId}`,
      providesTags: ["Workspaces"],
    }),
    createWorkspace: build.mutation<
      Workspace,
      { name: string; userId: number }
    >({
      query: (workspace) => ({
        url: "workspaces",
        method: "POST",
        body: workspace,
      }),
      invalidatesTags: ["Workspaces"],
    }),
    deleteWorkspace: build.mutation<void, { workspaceId: number; userId: number }>({
      query: ({ workspaceId, userId }) => ({
        url: `workspaces/${workspaceId}?userId=${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Workspaces", "Boards"],
    }),
    updateWorkspace: build.mutation<
      Workspace,
      { workspaceId: number; userId: number; name?: string; description?: string; joinPolicy?: number }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/${workspaceId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Workspaces"],
    }),
    updateWorkspaceIcon: build.mutation<
      Workspace,
      { workspaceId: number; iconExt: string; userId: number }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/${workspaceId}/icon`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Workspaces"],
    }),
    updateWorkspaceHeader: build.mutation<
      Workspace,
      { workspaceId: number; headerExt: string; userId: number }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/${workspaceId}/header`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Workspaces"],
    }),
    getWorkspaceMembers: build.query<WorkspaceMember[], number>({
      query: (workspaceId) => `workspaces/${workspaceId}/members`,
      providesTags: ["WorkspaceMembers"],
    }),
    addWorkspaceMember: build.mutation<
      WorkspaceMember,
      { workspaceId: number; email: string; userId: number }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/${workspaceId}/members`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["WorkspaceMembers"],
    }),

    // --- APPLICATIONS ---
    getDiscoverableWorkspaces: build.query<DiscoverableWorkspace[], number>({
      query: (userId) => `workspaces/discover?userId=${userId}`,
      providesTags: ["Workspaces"],
    }),
    applyToWorkspace: build.mutation<
      { joined: boolean; member?: WorkspaceMember; application?: WorkspaceApplication },
      { workspaceId: number; userId: number; message?: string }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/${workspaceId}/apply`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Workspaces", "WorkspaceMembers"],
    }),
    getWorkspaceApplications: build.query<
      WorkspaceApplication[],
      { workspaceId: number; userId: number; status?: number }
    >({
      query: ({ workspaceId, userId, status }) =>
        `workspaces/${workspaceId}/applications?userId=${userId}${status !== undefined ? `&status=${status}` : ""}`,
      providesTags: ["WorkspaceApplications"],
    }),
    resolveApplication: build.mutation<
      WorkspaceApplication,
      { workspaceId: number; applicationId: number; action: "approve" | "reject"; userId: number }
    >({
      query: ({ workspaceId, applicationId, ...body }) => ({
        url: `workspaces/${workspaceId}/applications/${applicationId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["WorkspaceApplications", "WorkspaceMembers"],
    }),

    // --- ROLES ---
    getRoles: build.query<Role[], number>({
      query: (workspaceId) => `workspaces/${workspaceId}/roles`,
      providesTags: ["Roles"],
    }),
    createRole: build.mutation<
      Role,
      { workspaceId: number; name: string; color: string; permissions: number; userId: number }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/${workspaceId}/roles`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Roles"],
    }),
    updateRole: build.mutation<
      Role,
      { workspaceId: number; roleId: number; userId: number; name?: string; color?: string; permissions?: number }
    >({
      query: ({ workspaceId, roleId, ...body }) => ({
        url: `workspaces/${workspaceId}/roles/${roleId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Roles"],
    }),
    deleteRole: build.mutation<void, { workspaceId: number; roleId: number; userId: number }>({
      query: ({ workspaceId, roleId, userId }) => ({
        url: `workspaces/${workspaceId}/roles/${roleId}?userId=${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Roles"],
    }),
    updateMemberRole: build.mutation<
      WorkspaceMember,
      { workspaceId: number; targetUserId: number; roleId: number; userId: number }
    >({
      query: ({ workspaceId, targetUserId, ...body }) => ({
        url: `workspaces/${workspaceId}/members/${targetUserId}/role`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["WorkspaceMembers"],
    }),

    // --- BOARDS ---
    getBoards: build.query<Board[], number>({
      query: (workspaceId) => `boards?workspaceId=${workspaceId}`,
      providesTags: ["Boards"],
    }),
    createBoard: build.mutation<
      Board,
      Partial<Board> & { workspaceId: number }
    >({
      query: (board) => ({
        url: "boards",
        method: "POST",
        body: board,
      }),
      invalidatesTags: ["Boards"],
    }),
    deleteBoard: build.mutation<void, number>({
      query: (boardId) => ({
        url: `boards/${boardId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Boards"],
    }),
    updateBoard: build.mutation<
      Board,
      { boardId: number; name: string; description?: string }
    >({
      query: ({ boardId, ...body }) => ({
        url: `boards/${boardId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Boards"],
    }),
    archiveBoard: build.mutation<Board, number>({
      query: (boardId) => ({
        url: `boards/${boardId}/archive`,
        method: "PATCH",
      }),
      invalidatesTags: ["Boards"],
    }),
    reorderBoards: build.mutation<
      Board[],
      { orderedIds: number[]; workspaceId: number }
    >({
      query: (body) => ({
        url: "boards/reorder",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Boards"],
    }),

    // --- TASKS ---
    getTasks: build.query<Task[], { boardId: number }>({
      query: ({ boardId }) => `tasks?boardId=${boardId}`,
      providesTags: (result, error, { boardId }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Tasks" as const, id })),
              { type: "Tasks" as const, id: `BOARD-${boardId}` },
              "Tasks",
            ]
          : ["Tasks"],
    }),
    getTaskById: build.query<Task, number>({
      query: (taskId) => `tasks/${taskId}`,
      providesTags: (result, error, taskId) => [{ type: "Tasks", id: taskId }],
    }),
    getTasksByUser: build.query<Task[], number>({
      query: (userId) => `tasks/user/${userId}`,
      providesTags: (result, error, userId) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks", id }))
          : [{ type: "Tasks", id: userId }],
    }),
    getTasksAssignedToUser: build.query<Task[], number>({
      query: (userId) => `tasks/user/${userId}/assigned`,
      providesTags: (result) =>
        result ? result.map(({ id }) => ({ type: "Tasks", id })) : ["Tasks"],
    }),
    getTasksAuthoredByUser: build.query<Task[], number>({
      query: (userId) => `tasks/user/${userId}/authored`,
      providesTags: (result) =>
        result ? result.map(({ id }) => ({ type: "Tasks", id })) : ["Tasks"],
    }),
    createTask: build.mutation<
      Task,
      Partial<Task> & {
        tagIds?: number[];
        sprintIds?: number[];
        assigneeIds?: number[];
      }
    >({
      query: (task) => ({
        url: "tasks",
        method: "POST",
        body: task,
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),
    updateTaskStatus: build.mutation<
      Task,
      { taskId: number; status: string; userId?: number }
    >({
      query: ({ taskId, status, userId }) => ({
        url: `tasks/${taskId}/status`,
        method: "PATCH",
        body: { status, userId },
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
        "Tasks",
        "Sprints",
      ],
    }),
    updateTask: build.mutation<
      Task,
      Partial<Task> & {
        id: number;
        tagIds?: number[];
        subtaskIds?: number[];
        sprintIds?: number[];
        assigneeIds?: number[];
        userId?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `tasks/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "Tasks", id },
        "Tasks",
        "Sprints",
      ],
    }),
    deleteTask: build.mutation<void, number>({
      query: (taskId) => ({
        url: `tasks/${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),

    // --- USERS ---
    getUsers: build.query<User[], void>({
      query: () => "users",
      providesTags: ["Users"],
    }),
    getUserById: build.query<User, number>({
      query: (userId) => `users/id/${userId}`,
      providesTags: (result, error, userId) => [{ type: "Users", id: userId }],
    }),
    getAuthUser: build.query({
      queryFn: async (
        args: { impersonatedCognitoId: string },
        _queryApi,
        _extraoptions,
        fetchWithBQ,
      ) => {
        try {
          const user = await getCurrentUser();
          const session = await fetchAuthSession();
          if (!session) throw new Error("No session found");
          const { userSub } = session;

          const cognitoIdToFetch = args.impersonatedCognitoId || userSub;
          const userDetailsResponse = await fetchWithBQ(
            `users/${cognitoIdToFetch}`,
          );
          const userDetails = userDetailsResponse.data as User;

          return {
            data: {
              user,
              userSub,
              userDetails,
              isImpersonating: !!args.impersonatedCognitoId,
              realUserSub: userSub,
            },
          };
        } catch (error) {
          return {
            error: {
              status: "CUSTOM_ERROR" as const,
              error: error instanceof Error ? error.message : String(error) || "Could not fetch user data",
            },
          };
        }
      },
      providesTags: (_result, _error, args) => [
        { type: "Users", id: `AUTH-${args.impersonatedCognitoId || "self"}` },
      ],
    }),
    updateUserProfilePicture: build.mutation<
      User,
      { cognitoId: string; profilePictureExt: string }
    >({
      query: ({ cognitoId, profilePictureExt }) => ({
        url: `users/${cognitoId}/profile-picture`,
        method: "PATCH",
        body: { profilePictureExt },
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserProfile: build.mutation<
      User,
      { cognitoId: string; fullName?: string }
    >({
      query: ({ cognitoId, ...body }) => ({
        url: `users/${cognitoId}/profile`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    adminUpdateUser: build.mutation<
      User,
      {
        userId: number;
        username?: string;
        fullName?: string;
        cognitoId?: string;
        email?: string;
      }
    >({
      query: ({ userId, ...body }) => ({
        url: `admin/users/${userId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    adminCreateUser: build.mutation<
      User,
      { username: string; cognitoId: string; email?: string; fullName?: string }
    >({
      query: (body) => ({
        url: "users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    adminDeleteUser: build.mutation<void, number>({
      query: (userId) => ({
        url: `admin/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),

    // --- SEARCH ---
    search: build.query<
      SearchResults,
      { query: string; workspaceId: number; categories?: string[] }
    >({
      query: ({ query, workspaceId, categories }) => {
        const params = new URLSearchParams({
          query,
          workspaceId: workspaceId.toString(),
        });
        if (categories && categories.length > 0) {
          params.set("categories", categories.join(","));
        }
        return `search?${params.toString()}`;
      },
    }),

    // --- TAGS ---
    getTags: build.query<Tag[], number>({
      query: (workspaceId) => `tags?workspaceId=${workspaceId}`,
      providesTags: ["Tags"],
    }),
    createTag: build.mutation<
      Tag,
      { name: string; color?: string; workspaceId: number }
    >({
      query: (body) => ({
        url: "tags",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tags"],
    }),
    updateTag: build.mutation<
      Tag,
      { tagId: number; name?: string; color?: string }
    >({
      query: ({ tagId, ...body }) => ({
        url: `tags/${tagId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Tags"],
    }),
    deleteTag: build.mutation<void, number>({
      query: (tagId) => ({
        url: `tags/${tagId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tags"],
    }),

    // --- SPRINTS ---
    getSprints: build.query<Sprint[], number>({
      query: (workspaceId) => `sprints?workspaceId=${workspaceId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Sprints" as const, id })),
              { type: "Sprints" as const },
            ]
          : [{ type: "Sprints" as const }],
    }),
    getSprint: build.query<Sprint, number>({
      query: (sprintId) => `sprints/${sprintId}`,
      providesTags: (result, error, sprintId) => [
        { type: "Sprints", id: sprintId },
        { type: "Sprints" },
      ],
    }),
    createSprint: build.mutation<
      Sprint,
      {
        title: string;
        workspaceId: number;
        startDate?: string;
        dueDate?: string;
      }
    >({
      query: (body) => ({
        url: "sprints",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sprints"],
    }),
    updateSprint: build.mutation<
      Sprint,
      { sprintId: number; title?: string; startDate?: string; dueDate?: string }
    >({
      query: ({ sprintId, ...body }) => ({
        url: `sprints/${sprintId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { sprintId }) => [
        { type: "Sprints", id: sprintId },
        "Sprints",
      ],
    }),
    deleteSprint: build.mutation<void, number>({
      query: (sprintId) => ({
        url: `sprints/${sprintId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Sprints"],
    }),
    addTaskToSprint: build.mutation<void, { sprintId: number; taskId: number }>(
      {
        query: ({ sprintId, taskId }) => ({
          url: `sprints/${sprintId}/tasks/${taskId}`,
          method: "POST",
        }),
        invalidatesTags: (result, error, { sprintId }) => [
          { type: "Sprints", id: sprintId },
          "Sprints",
        ],
      },
    ),
    removeTaskFromSprint: build.mutation<
      void,
      { sprintId: number; taskId: number }
    >({
      query: ({ sprintId, taskId }) => ({
        url: `sprints/${sprintId}/tasks/${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { sprintId }) => [
        { type: "Sprints", id: sprintId },
        "Sprints",
      ],
    }),
    duplicateSprint: build.mutation<
      Sprint,
      { sprintId: number; title?: string; includeFinishedTasks?: boolean }
    >({
      query: ({ sprintId, title, includeFinishedTasks }) => ({
        url: `sprints/${sprintId}/duplicate`,
        method: "POST",
        body: { title, includeFinishedTasks },
      }),
      invalidatesTags: ["Sprints"],
    }),
    archiveSprint: build.mutation<Sprint, number>({
      query: (sprintId) => ({
        url: `sprints/${sprintId}/archive`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, sprintId) => [
        { type: "Sprints", id: sprintId },
        "Sprints",
      ],
    }),

    // --- COMMENTS, REACTIONS, S3, ACTIVITIES, NOTIFICATIONS, ATTACHMENTS ---
    createComment: build.mutation<
      Comment,
      { taskId: number; userId: number; text: string }
    >({
      query: (body) => ({ url: "comments", method: "POST", body }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),
    toggleCommentResolved: build.mutation<Comment, { commentId: number }>({
      query: ({ commentId }) => ({
        url: `comments/${commentId}/resolved`,
        method: "PATCH",
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),
    toggleReaction: build.mutation<
      CommentReaction | null,
      { commentId: number; userId: number; emoji: string }
    >({
      query: (body) => ({ url: "reactions/toggle", method: "POST", body }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),
    getPresignedUrl: build.query<{ url: string }, string>({
      query: (key) => `s3/presigned?key=${encodeURIComponent(key)}`,
      keepUnusedDataFor: 3500,
    }),
    getPresignedUploadUrl: build.mutation<
      { url: string },
      { key: string; contentType: string }
    >({
      query: (body) => ({ url: "s3/presigned/upload", method: "POST", body }),
    }),
    getActivitiesByTask: build.query<Activity[], number>({
      query: (taskId) => `activities?taskId=${taskId}`,
      providesTags: (result, error, taskId) => [
        { type: "Activities", id: taskId },
        "Activities",
      ],
    }),
    getNotifications: build.query<Notification[], number>({
      query: (userId) => `notifications?userId=${userId}`,
      providesTags: ["Notifications"],
    }),
    getUnreadCount: build.query<UnreadCountResponse, number>({
      query: (userId) => `notifications/unread-count?userId=${userId}`,
      providesTags: ["Notifications"],
    }),
    markNotificationAsRead: build.mutation<
      Notification,
      { notificationId: number; userId: number }
    >({
      query: ({ notificationId, userId }) => ({
        url: `notifications/${notificationId}/read?userId=${userId}`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),
    markAllNotificationsAsRead: build.mutation<
      { message: string; count: number },
      number
    >({
      query: (userId) => ({
        url: `notifications/mark-all-read?userId=${userId}`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: build.mutation<
      { message: string },
      { notificationId: number; userId: number }
    >({
      query: ({ notificationId, userId }) => ({
        url: `notifications/${notificationId}?userId=${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),
    batchDeleteNotifications: build.mutation<
      { message: string; count: number },
      { ids: number[]; userId: number }
    >({
      query: ({ ids, userId }) => ({
        url: `notifications/batch?userId=${userId}`,
        method: "DELETE",
        body: { ids },
      }),
      invalidatesTags: ["Notifications"],
    }),
    createAttachment: build.mutation<
      Attachment,
      {
        taskId: number;
        uploadedById: number;
        fileName: string;
        fileExt: string;
      }
    >({
      query: (body) => ({ url: "attachments", method: "POST", body }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),
    deleteAttachment: build.mutation<void, number>({
      query: (attachmentId) => ({
        url: `attachments/${attachmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),

    // --- ANALYTICS ---
    getPointsAnalytics: build.query<PointsDataPoint[], PointsAnalyticsParams>({
      query: ({ userId, workspaceId, groupBy, startDate, endDate }) =>
        `analytics/points?userId=${userId}&workspaceId=${workspaceId}&groupBy=${groupBy}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      providesTags: ["Analytics"],
    }),
  }),
});

export const {
  // Workspaces
  useAdminGetAllWorkspacesQuery,
  useAdminUpdateWorkspaceMutation,
  useAdminDeleteWorkspaceMutation,
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useUpdateWorkspaceIconMutation,
  useUpdateWorkspaceHeaderMutation,
  useGetWorkspaceMembersQuery,
  useAddWorkspaceMemberMutation,
  // Applications
  useGetDiscoverableWorkspacesQuery,
  useApplyToWorkspaceMutation,
  useGetWorkspaceApplicationsQuery,
  useResolveApplicationMutation,
  // Roles
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useUpdateMemberRoleMutation,
  // Boards (Replaced Projects)
  useGetBoardsQuery,
  useCreateBoardMutation,
  useDeleteBoardMutation,
  useArchiveBoardMutation,
  useUpdateBoardMutation,
  useReorderBoardsMutation,
  // Tasks
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useGetTasksByUserQuery,
  useGetTasksAssignedToUserQuery,
  useGetTasksAuthoredByUserQuery,
  // Users
  useSearchQuery,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetAuthUserQuery,
  useUpdateUserProfilePictureMutation,
  useUpdateUserProfileMutation,
  useAdminUpdateUserMutation,
  useAdminCreateUserMutation,
  useAdminDeleteUserMutation,
  // Tags
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  // Comments & Reactions
  useCreateCommentMutation,
  useToggleCommentResolvedMutation,
  useToggleReactionMutation,
  // S3
  useGetPresignedUrlQuery,
  useLazyGetPresignedUrlQuery,
  useGetPresignedUploadUrlMutation,
  // Sprints
  useGetSprintsQuery,
  useGetSprintQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
  useAddTaskToSprintMutation,
  useRemoveTaskFromSprintMutation,
  useDuplicateSprintMutation,
  useArchiveSprintMutation,
  // Activities, Notifications, Analytics, Attachments
  useGetActivitiesByTaskQuery,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useBatchDeleteNotificationsMutation,
  useGetPointsAnalyticsQuery,
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
} = api;
