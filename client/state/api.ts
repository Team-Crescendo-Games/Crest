import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

export interface Project {
    id: number;
    name: string;
    description?: string;
}

export enum Priority {
    Urgent = "Urgent",
    High = "High",
    Medium = "Medium",
    Low = "Low",
    Backlog = "Backlog",
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
export const getAttachmentS3Key = (taskId: number, attachmentId: number, fileExt: string) =>
    `tasks/${taskId}/attachments/${attachmentId}.${fileExt}`;

export interface Comment {
    id: number;
    text: string;
    taskId: number;
    userId: number;
    user?: User;
}

export interface TaskTag {
    id: number;
    taskId: number;
    tagId: number;
    tag: Tag;
}

export interface SubtaskSummary {
    id: number;
    title: string;
    status?: string;
    priority?: string;
    assignee?: { userId: number; username: string; profilePictureExt?: string };
}

export interface ParentTaskSummary {
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
    assignedUserId?: number;

    author?: User;
    assignee?: User;
    comments?: Comment[];
    attachments?: Attachment[];
    taskTags?: TaskTag[];
    subtasks?: SubtaskSummary[];
    parentTask?: ParentTaskSummary | null;
}

export interface SearchResults {
    tasks?: Task[];
    projects?: Project[];
    users?: User[];
}

export interface Tag {
    id: number;
    name: string;
    color?: string;
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
    tagTypes: ["Projects", "Tasks", "Users", "Tags"],
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

        updateProject: build.mutation<Project, { projectId: number; name: string; description?: string }>({
            query: ({ projectId, ...body }) => ({
                url: `projects/${projectId}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["Projects"],
        }),

        // tasks
        getTasks: build.query<Task[], { projectId: number }>({
            query: ({ projectId }) => `tasks?projectId=${projectId}`,
            providesTags: (result) =>
                result
                    ? result.map(({ id }) => ({ type: "Tasks" as const, id }))
                    : [{ type: "Tasks" as const }],
        }),

        getTasksByUser: build.query<Task[], number>({
            query: (userId) => `tasks/user/${userId}`,
            providesTags: (result, error, userId) =>
                result
                    ? result.map(({ id }) => ({ type: "Tasks", id }))
                    : [{ type: "Tasks", id: userId }],
        }),

        createTask: build.mutation<Task, Partial<Task> & { tagIds?: number[] }>({
            query: (task) => ({
                url: "tasks",
                method: "POST",
                body: task,
            }),
            invalidatesTags: ["Tasks"],
        }),

        updateTaskStatus: build.mutation<Task, { taskId: number; status: string }>({
            query: ({ taskId, status }) => ({
                url: `tasks/${taskId}/status`,
                method: "PATCH",
                body: { status },
            }),
            invalidatesTags: (result, error, { taskId }) => [
                { type: "Tasks", id: taskId },
            ],
        }),

        updateTask: build.mutation<Task, Partial<Task> & { id: number; tagIds?: number[]; subtaskIds?: number[] }>({
            query: ({ id, ...body }) => ({
                url: `tasks/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_, __, { id }) => [
                { type: "Tasks", id },
                "Tasks", // Invalidate all tasks to refresh subtask relationships
            ],
        }),

        // users
        getUsers: build.query<User[], void>({
            query: () => "users",
            providesTags: ["Users"],
        }),

        getAuthUser: build.query({
            queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
                try {
                    const user = await getCurrentUser();
                    const session = await fetchAuthSession();
                    if (!session) throw new Error("No session found");
                    const { userSub } = session;
                    const { accessToken } = session.tokens ?? {};

                    const userDetailsResponse = await fetchWithBQ(`users/${userSub}`);
                    const userDetails = userDetailsResponse.data as User;

                    return { data: { user, userSub, userDetails } };
                } catch (error: any) {
                    return { error: error.message || "Could not fetch user data" };
                }
            },
        }),

        // search
        search: build.query<SearchResults, string>({
            query: (query) => `search?query=${query}`,
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

        updateTag: build.mutation<Tag, { tagId: number; name?: string; color?: string }>({
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

        // comments
        createComment: build.mutation<Comment, { taskId: number; userId: number; text: string }>({
            query: (body) => ({
                url: "comments",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Tasks"],
        }),

        // s3 presigned urls
        getPresignedUrl: build.query<{ url: string }, string>({
            query: (key) => `s3/presigned?key=${encodeURIComponent(key)}`,
            keepUnusedDataFor: 3500, // Cache for ~1 hour (slightly less than URL expiry)
        }),

        getPresignedUploadUrl: build.mutation<{ url: string }, { key: string; contentType: string }>({
            query: (body) => ({
                url: "s3/presigned/upload",
                method: "POST",
                body,
            }),
        }),
    }),
});

export const {
    useGetProjectsQuery,
    useCreateProjectMutation,
    useDeleteProjectMutation,
    useUpdateProjectMutation,
    useGetTasksQuery,
    useCreateTaskMutation,
    useUpdateTaskStatusMutation,
    useUpdateTaskMutation,
    useSearchQuery,
    useGetUsersQuery,
    useGetTasksByUserQuery,
    useGetAuthUserQuery,
    useGetTagsQuery,
    useCreateTagMutation,
    useUpdateTagMutation,
    useDeleteTagMutation,
    useCreateCommentMutation,
    useGetPresignedUrlQuery,
    useGetPresignedUploadUrlMutation,
} = api;
