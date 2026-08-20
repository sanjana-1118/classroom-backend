import express from "express";
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const conditions = [];
    if (req.user?.role === "teacher") conditions.push(eq(classes.teacherId, req.user.id ?? ""));
    if (req.user?.role === "student") {
      conditions.push(sql`${classes.id} IN (SELECT ${enrollments.classId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${req.user.id})`);
    }

    const rows = await db.select({
      ...getTableColumns(classes),
      subject: { name: subjects.name, code: subjects.code },
      teacher: { name: user.name },
      department: { name: departments.name },
    })
      .from(classes)
      .innerJoin(subjects, eq(classes.subjectId, subjects.id))
      .innerJoin(departments, eq(subjects.departmentId, departments.id))
      .innerJoin(user, eq(classes.teacherId, user.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(classes.name));

    return res.json({ data: rows });
  } catch (error) {
    console.error("GET /timetable error:", error);
    return res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

export default router;