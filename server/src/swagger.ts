import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "TaskManager API",
            version: "1.0.0",
            description: "API documentation for the TaskManager project management application",
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 8000}`,
                description: "Development server",
            },
        ],
        components: {
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        userId: { type: "integer" },
                        cognitoId: { type: "string" },
                        username: { type: "string" },
                        fullName: { type: "string", nullable: true },
                        email: { type: "string", nullable: true },
                        profilePictureExt: { type: "string", nullable: true },
                    },
                },
                Project: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        description: { type: "string", nullable: true },
                        isActive: { type: "boolean" },
                    },
                },
                Task: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        title: { type: "string" },
                        description: { type: "string", nullable: true },
                        status: {
                            type: "integer",
                            description: "0=Input Queue, 1=Work In Progress, 2=Review, 3=Done",
                        },
                        priority: {
                            type: "string",
                            enum: ["Urgent", "High", "Medium", "Low", "Backlog"],
                        },
                        startDate: { type: "string", format: "date-time", nullable: true },
                        dueDate: { type: "string", format: "date-time", nullable: true },
                        points: { type: "integer", nullable: true },
                        projectId: { type: "integer" },
                        authorUserId: { type: "integer" },
                        parentTaskId: { type: "integer", nullable: true },
                    },
                },
                Sprint: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        title: { type: "string" },
                        startDate: { type: "string", format: "date-time", nullable: true },
                        dueDate: { type: "string", format: "date-time", nullable: true },
                        isActive: { type: "boolean" },
                    },
                },
                Tag: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        color: { type: "string", nullable: true },
                    },
                },
                Comment: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        text: { type: "string" },
                        taskId: { type: "integer" },
                        userId: { type: "integer" },
                        createdAt: { type: "string", format: "date-time" },
                        isResolved: { type: "boolean" },
                    },
                },
                Attachment: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        fileName: { type: "string", nullable: true },
                        fileExt: { type: "string" },
                        taskId: { type: "integer" },
                        uploadedById: { type: "integer" },
                    },
                },
                Activity: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        taskId: { type: "integer" },
                        userId: { type: "integer" },
                        activityType: { type: "integer", description: "0=Create, 1=Move, 2=Edit" },
                        previousStatus: { type: "string", nullable: true },
                        newStatus: { type: "string", nullable: true },
                        editField: { type: "string", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                Notification: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        userId: { type: "integer" },
                        type: {
                            type: "integer",
                            description:
                                "0=Mention, 1=NearOverdue, 2=Overdue, 3=TaskEdited, 4=TaskReassigned",
                        },
                        severity: { type: "integer", description: "0=Info, 1=Medium, 2=Critical" },
                        message: { type: "string", nullable: true },
                        isRead: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        taskId: { type: "integer", nullable: true },
                        commentId: { type: "integer", nullable: true },
                        activityId: { type: "integer", nullable: true },
                    },
                },
                CommentReaction: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        emoji: { type: "string" },
                        commentId: { type: "integer" },
                        userId: { type: "integer" },
                    },
                },
                Error: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                    },
                },
            },
        },
        tags: [
            { name: "Projects", description: "Project management endpoints" },
            { name: "Tasks", description: "Task management endpoints" },
            { name: "Users", description: "User management endpoints" },
            { name: "Sprints", description: "Sprint management endpoints" },
            { name: "Tags", description: "Tag management endpoints" },
            { name: "Comments", description: "Comment endpoints" },
            { name: "Notifications", description: "Notification endpoints" },
            { name: "Activities", description: "Activity log endpoints" },
            { name: "Attachments", description: "File attachment endpoints" },
            { name: "Reactions", description: "Comment reaction endpoints" },
            { name: "S3", description: "S3 presigned URL endpoints" },
            { name: "Search", description: "Search endpoints" },
            { name: "Admin", description: "Admin endpoints" },
        ],
    },
    apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
