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
    // Reset PostgreSQL sequences to max ID + 1 for all tables with auto-increment
    const sequences = [
        { table: 'User', column: 'userId' },
        { table: 'Project', column: 'id' },
        { table: 'Task', column: 'id' },
        { table: 'Tag', column: 'id' },
        { table: 'TaskTag', column: 'id' },
        { table: 'TaskAssignment', column: 'id' },
        { table: 'Attachment', column: 'id' },
        { table: 'Comment', column: 'id' },
        { table: 'Sprint', column: 'id' },
        { table: 'SprintTask', column: 'id' },
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
        "tag.json",
        "project.json",
        "user.json",
        "task.json",
        "sprint.json",
        "sprintTask.json",
        "attachment.json",
        "comment.json",
        "taskAssignment.json",
        "taskTag.json",
    ];

    await deleteAllData(orderedFileNames);

    for (const fileName of orderedFileNames) {
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

    // Reset sequences after seeding to prevent ID conflicts
    await resetSequences();
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
