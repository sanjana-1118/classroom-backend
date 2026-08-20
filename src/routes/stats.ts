import express from "express";
import { sql, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { subjects, classes, enrollments, user } from "../schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const subjectsCount = await db.select({ count: sql<number>`count(*)` }).from(subjects);
    const classesCount = await db.select({ count: sql<number>`count(*)` }).from(classes);
    const enrollmentsCount = await db.select({ count: sql<number>`count(*)` }).from(enrollments);
    
    const studentsCount = await db.select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.role, 'student'));
      
    const teachersCount = await db.select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.role, 'teacher'));

    res.status(200).json({
      data: {
        totalSubjects: Number(subjectsCount[0]?.count ?? 0),
        totalClasses: Number(classesCount[0]?.count ?? 0),
        totalEnrollments: Number(enrollmentsCount[0]?.count ?? 0),
        totalStudents: Number(studentsCount[0]?.count ?? 0),
        totalTeachers: Number(teachersCount[0]?.count ?? 0),
      }
    });
  } catch (error) {
    console.error("GET /stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
