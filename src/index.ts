// APM agent removed for Vercel compatibility

import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import studentsRouter from "./routes/students.js";
import profileRouter from "./routes/profile.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import statsRouter from "./routes/stats.js";
import enrollmentsRouter from "./routes/enrollments.js";
import announcementsRouter from "./routes/announcements.js";
import timetableRouter from "./routes/timetable.js";
import facultyRouter from "./routes/faculty.js";
import securityMiddleware from "./middleware/security.js";
import { requireAuth, requireRole, requireRoleForMethods } from "./middleware/auth.js";

import { auth } from "./lib/auth.js";

const app = express();
// Setting to 8080 to match your Railway Networking settings
const PORT = process.env.PORT || 8080;

// Dynamic CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const configuredOrigin = process.env.FRONTEND_URL ?? "http://localhost:5173";
      const isLocalFrontend = !!origin && /^http:\/\/localhost:\d+$/.test(origin);

      if (!origin || origin === configuredOrigin || isLocalFrontend) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleware);
app.use("/api", requireAuth);

// API Routes
app.use("/api/subjects", requireRole("admin", "teacher"), subjectsRouter);
app.use("/api/users", requireRole("admin"), usersRouter);
app.use("/api/students", requireRole("admin", "teacher"), studentsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/classes", requireRoleForMethods(["POST", "PATCH", "DELETE"], "admin", "teacher"), classesRouter);
app.use("/api/departments", requireRole("admin", "teacher"), departmentsRouter);
app.use("/api/stats", requireRole("admin", "teacher"), statsRouter);
app.use("/api/enrollments", requireRoleForMethods(["DELETE"], "admin", "teacher"), enrollmentsRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/faculty", requireRole("admin", "teacher"), facultyRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running successfully!");
});

// Added "0.0.0.0" to ensure it accepts connections in a containerized environment
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});