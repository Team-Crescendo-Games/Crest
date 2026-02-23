import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.ts";

import workspaceRoutes from "./routes/workspaceRoutes.ts";
import boardRoutes from "./routes/boardRoutes.ts";
import taskRoutes from "./routes/taskRoutes.ts";
import userRoutes from "./routes/userRoutes.ts";
import searchRoutes from "./routes/searchRoutes.ts";
import tagRoutes from "./routes/tagRoutes.ts";
import commentRoutes from "./routes/commentRoutes.ts";
import s3Routes from "./routes/s3Routes.ts";
import sprintRoutes from "./routes/sprintRoutes.ts";
import reactionRoutes from "./routes/reactionRoutes.ts";
import activityRoutes from "./routes/activityRoutes.ts";
import attachmentRoutes from "./routes/attachmentRoutes.ts";
import notificationRoutes from "./routes/notificationRoutes.ts";
import adminRoutes from "./routes/adminRoutes.ts";
import analyticsRoutes from "./routes/analyticsRoutes.ts";
import applicationRoutes from "./routes/applicationRoutes.ts";
import { joinRouter } from "./routes/invitationRoutes.ts";
import { postUser } from "./controllers/userController.ts";

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(cors());

// Swagger API docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (_req, res) => {
    res.send("This is the home route");
});

app.use("/workspaces", workspaceRoutes);
app.use("/workspaces", applicationRoutes);
app.use("/boards", boardRoutes);
app.use("/tasks", taskRoutes);
app.use("/users", userRoutes);
app.use("/search", searchRoutes);
app.use("/tags", tagRoutes);
app.use("/comments", commentRoutes);
app.use("/s3", s3Routes);
app.use("/sprints", sprintRoutes);
app.use("/reactions", reactionRoutes);
app.use("/activities", activityRoutes);
app.use("/attachments", attachmentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/invitations", joinRouter);
app.post("/create-user", postUser);

import { createServer } from "http";
import { initSocket } from "./socket.ts";

const httpServer = createServer(app);
initSocket(httpServer);

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
});
