import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function deleteAllData(orderedFileNames: string[]) {
    const modelNames = orderedFileNames.map((fileName) => {
        const modelName = path.basename(fileName, path.extname(fileName));
        return modelName.charAt(0).toUpperCase() + modelName.slice(1);
    });

    for (const modelName of modelNames) {
        const model: any = prisma[modelName as keyof typeof prisma];
        try {
            await model.deleteMany({});
            console.log(`Cleared data from ${modelName}`);
        } catch (error) {
            console.error(`Error clearing data from ${modelName}:`, error);
        }
    }
}

async function resetSequences() {
    const sequences = [
        { table: "User", column: "userId" },
        { table: "Workspace", column: "id" },
        { table: "WorkspaceMember", column: "id" },
        { table: "Board", column: "id" },
        { table: "Task", column: "id" },
        { table: "Tag", column: "id" },
        { table: "TaskTag", column: "id" },
        { table: "TaskAssignment", column: "id" },
        { table: "Attachment", column: "id" },
        { table: "Comment", column: "id" },
        { table: "CommentReaction", column: "id" },
        { table: "Sprint", column: "id" },
        { table: "SprintTask", column: "id" },
        { table: "Activity", column: "id" },
        { table: "Notification", column: "id" },
    ];

    for (const { table, column } of sequences) {
        try {
            await prisma.$executeRawUnsafe(
                `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 0) + 1, false)`
            );
            console.log(`Reset sequence for ${table}.${column}`);
        } catch (error) {
            console.error(`Error resetting sequence for ${table}.${column}:`, error);
        }
    }
}

async function main() {
    const dataDirectory = path.join(__dirname, "seedData");

    const orderedFileNames = [
        "notification.json",
        "commentReaction.json",
        "activity.json",
        "sprintTask.json",
        "taskTag.json",
        "taskAssignment.json",
        "attachment.json",
        "comment.json",
        "sprint.json",
        "task.json",
        "tag.json",
        "board.json",
        "workspaceMember.json",
        "workspace.json",
        "user.json",
    ];

    await deleteAllData(orderedFileNames);

    // Seed in reverse order (dependencies first)
    const seedOrder = [
        "user.json",
        "workspace.json",
        "workspaceMember.json",
        "tag.json",
        "board.json",
        "task.json",
        "sprint.json",
        "sprintTask.json",
        "attachment.json",
        "comment.json",
        "commentReaction.json",
        "taskAssignment.json",
        "taskTag.json",
        "activity.json",
        "notification.json",
    ];

    for (const fileName of seedOrder) {
        const filePath = path.join(dataDirectory, fileName);
        const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const modelName = path.basename(fileName, path.extname(fileName));
        const model: any = prisma[modelName as keyof typeof prisma];

        try {
            for (const data of jsonData) {
                await model.create({ data });
            }
            console.log(`Seeded ${modelName} with data from ${fileName}`);
        } catch (error) {
            console.error(`Error seeding data for ${modelName}:`, error);
        }
    }

    await resetSequences();
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
