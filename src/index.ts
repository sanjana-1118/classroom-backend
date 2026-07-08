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
// Setting to 8080 to match your Railway Networking settings
const PORT = process.env.PORT || 8080; 

// Dynamic CORS configuration
app.use(
  cors({
    origin: "*",
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

// Added "0.0.0.0" to ensure it accepts connections in a containerized environment
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});