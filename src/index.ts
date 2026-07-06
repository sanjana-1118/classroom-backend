import('apminsight')
  .then((module) => {
    const AgentAPI = module.default;
    AgentAPI.config();
  })
  .catch(() => console.log('APM not available in this environment'));

import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import statsRouter from "./routes/stats.js";
import enrollmentsRouter from "./routes/enrollments.js";
import securityMiddleware from "./middleware/security.js";

import { auth } from "./lib/auth.js";

const app = express();
const PORT = 8000;

// Dynamic CORS configuration to support both Vite local development ports
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"], 
    methods: ["GET", "POST", "PUT", "DELETE"], 
    credentials: true, 
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleware);

// API Routes
app.use("/api/subjects", subjectsRouter);
app.use("/api/users", usersRouter);
app.use("/api/classes", classesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/enrollments", enrollmentsRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running successfully!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});