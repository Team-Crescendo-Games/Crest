import dotenv from "dotenv";
dotenv.config();

import express from  "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import projectRoutes from "./routes/projectRoutes.ts";
import taskRoutes from "./routes/taskRoutes.ts";
import userRoutes from "./routes/userRoutes.ts";
import teamRoutes from "./routes/teamRoutes.ts";
import searchRoutes from "./routes/searchRoutes.ts";

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("This is the home route");
});

app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);
app.use("/users", userRoutes);
app.use("/teams", teamRoutes);
app.use("/search", searchRoutes);

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});