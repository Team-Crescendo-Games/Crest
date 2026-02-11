import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

export interface Project {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
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

// Helper to construct S3 key for user profile pictures
export const getUserProfileS3Key = (userId: number, ext: string) =>
  `users/${userId}/profile.${ext}`;

export interface Attachment {
  id: number;
  fileName: string;
  fileExt: string;
  taskId: number;
  uploadedById: number;
}

// Helper to construct S3 key for attachments
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
  projectId: number;
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

export interface SearchResults {
  tasks?: Task[];
  projects?: Project[];
  users?: User[];
  sprints?: Sprint[];
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface Sprint {
  id: number;
  title: string;
  startDate?: string;
  dueDate?: string;
  isActive?: boolean;
  tasks?: Task[];
  _count?: { sprintTasks: number };
}

export interface PointsDataPoint {
  date: string;
  points: number;
  label: string;
}

export interface PointsAnalyticsParams {
  userId: number;
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
    "Projects",
    "Tasks",
    "Users",
    "Tags",
    "Sprints",
    "Activities",
    "Notifications",
    "Analytics",
  ],
  endpoints: (build) => ({
    // projects
    getProjects: build.query<Project[], void>({
      query: () => "projects",
      providesTags: ["Projects"],
    }),

    createProject: build.mutation<Project, Partial<Project>>({
      query: (project) => ({
        url: "projects",
        method: "POST",
        body: project,
      }),
      invalidatesTags: ["Projects"],
    }),

    deleteProject: build.mutation<void, number>({
      query: (projectId) => ({
        url: `projects/${projectId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projects"],
    }),

    updateProject: build.mutation<
      Project,
      { projectId: number; name: string; description?: string }
    >({
      query: ({ projectId, ...body }) => ({
        url: `projects/${projectId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Projects"],
    }),

    archiveProject: build.mutation<Project, number>({
      query: (projectId) => ({
        url: `projects/${projectId}/archive`,
        method: "PATCH",
      }),
      invalidatesTags: ["Projects"],
    }),

    reorderProjects: build.mutation<Project[], number[]>({
      query: (orderedIds) => ({
        url: "projects/reorder",
        method: "PATCH",
        body: { orderedIds },
      }),
      invalidatesTags: ["Projects"],
    }),

    // tasks
    getTasks: build.query<Task[], { projectId: number }>({
      query: ({ projectId }) => `tasks?projectId=${projectId}`,
      providesTags: (result, error, { projectId }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Tasks" as const, id })),
              { type: "Tasks" as const, id: `PROJECT-${projectId}` },
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
        "Tasks", // Invalidate all task queries to refresh the board
        "Sprints", // Invalidate sprints to refresh sprint board views
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
        "Tasks", // Invalidate all tasks to refresh subtask relationships
        "Sprints", // Invalidate sprints when task sprint associations change
      ],
    }),

    deleteTask: build.mutation<void, number>({
      query: (taskId) => ({
        url: `tasks/${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),

    // users
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

          // If impersonating (non-empty string), fetch the impersonated user's details
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
        } catch (error: any) {
          return { error: error.message || "Could not fetch user data" };
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

    // admin endpoints
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

    // search
    search: build.query<
      SearchResults,
      { query: string; categories?: string[] }
    >({
      query: ({ query, categories }) => {
        const params = new URLSearchParams({ query });
        if (categories && categories.length > 0) {
          params.set("categories", categories.join(","));
        }
        return `search?${params.toString()}`;
      },
    }),

    // tags
    getTags: build.query<Tag[], void>({
      query: () => "tags",
      providesTags: ["Tags"],
    }),

    createTag: build.mutation<Tag, { name: string; color?: string }>({
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

    // sprints
    getSprints: build.query<Sprint[], void>({
      query: () => "sprints",
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
      { title: string; startDate?: string; dueDate?: string }
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

    // comments
    createComment: build.mutation<
      Comment,
      { taskId: number; userId: number; text: string }
    >({
      query: (body) => ({
        url: "comments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),

    toggleCommentResolved: build.mutation<Comment, { commentId: number }>({
      query: ({ commentId }) => ({
        url: `comments/${commentId}/resolved`,
        method: "PATCH",
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),

    // reactions
    toggleReaction: build.mutation<
      CommentReaction | null,
      { commentId: number; userId: number; emoji: string }
    >({
      query: (body) => ({
        url: "reactions/toggle",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),

    // s3 presigned urls
    getPresignedUrl: build.query<{ url: string }, string>({
      query: (key) => `s3/presigned?key=${encodeURIComponent(key)}`,
      keepUnusedDataFor: 3500, // Cache for ~1 hour (slightly less than URL expiry)
    }),

    getPresignedUploadUrl: build.mutation<
      { url: string },
      { key: string; contentType: string }
    >({
      query: (body) => ({
        url: "s3/presigned/upload",
        method: "POST",
        body,
      }),
    }),

    // activities
    getActivitiesByTask: build.query<Activity[], number>({
      query: (taskId) => `activities?taskId=${taskId}`,
      providesTags: (result, error, taskId) => [
        { type: "Activities", id: taskId },
        "Activities",
      ],
    }),

    // notifications
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

    // analytics
    getPointsAnalytics: build.query<PointsDataPoint[], PointsAnalyticsParams>({
      query: ({ userId, groupBy, startDate, endDate }) =>
        `analytics/points?userId=${userId}&groupBy=${groupBy}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      providesTags: ["Analytics"],
    }),

    // attachments
    createAttachment: build.mutation<
      Attachment,
      {
        taskId: number;
        uploadedById: number;
        fileName: string;
        fileExt: string;
      }
    >({
      query: (body) => ({
        url: "attachments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),

    deleteAttachment: build.mutation<void, number>({
      query: (attachmentId) => ({
        url: `attachments/${attachmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks", "Sprints"],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useArchiveProjectMutation,
  useUpdateProjectMutation,
  useReorderProjectsMutation,
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useSearchQuery,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetTasksByUserQuery,
  useGetTasksAssignedToUserQuery,
  useGetTasksAuthoredByUserQuery,
  useGetAuthUserQuery,
  useUpdateUserProfilePictureMutation,
  useUpdateUserProfileMutation,
  useAdminUpdateUserMutation,
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useCreateCommentMutation,
  useToggleCommentResolvedMutation,
  useToggleReactionMutation,
  useGetPresignedUrlQuery,
  useLazyGetPresignedUrlQuery,
  useGetPresignedUploadUrlMutation,
  useGetSprintsQuery,
  useGetSprintQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
  useAddTaskToSprintMutation,
  useRemoveTaskFromSprintMutation,
  useDuplicateSprintMutation,
  useArchiveSprintMutation,
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
