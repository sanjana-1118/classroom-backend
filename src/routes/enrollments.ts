import express from "express";
import { eq, and, desc, sql, getTableColumns } from "drizzle-orm";
import { db } from "../db/index.js";
import { enrollments, classes, user } from "../schema/index.js";

const router = express.Router();

// Get enrollments with optional filtering by studentId or classId, and pagination
router.get("/", async (req, res) => {
  try {
    const { studentId, classId, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (studentId) {
      filterConditions.push(eq(enrollments.studentId, String(studentId)));
    }

    if (req.user?.role === "student") {
      filterConditions.push(eq(enrollments.studentId, req.user.id ?? ""));
    } else if (req.user?.role === "teacher") {
      filterConditions.push(
        sql`${enrollments.classId} IN (SELECT ${classes.id} FROM ${classes} WHERE ${classes.teacherId} = ${req.user.id})`
      );
    }

    if (classId) {
      filterConditions.push(eq(enrollments.classId, Number(classId)));
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(whereClause);

    const totalCount = Number(countResult[0]?.count ?? 0);

    const enrollmentsList = await db
      .select({
        ...getTableColumns(enrollments),
        class: {
          id: classes.id,
          name: classes.name,
          status: classes.status,
          inviteCode: classes.inviteCode,
        },
        student: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        },
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(whereClause)
      .orderBy(desc(enrollments.createdAt), desc(enrollments.id))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: enrollmentsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /enrollments error:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

// Enroll a student in a class
router.post("/", async (req, res) => {
  try {
    const { studentId, classId } = req.body;
    const numericClassId = Number(classId);

    if (req.user?.role === "student" && String(studentId) !== req.user.id) {
      return res.status(403).json({ error: "Students can only enroll themselves" });
    }

    if (!studentId || !Number.isInteger(numericClassId) || numericClassId < 1) {
      return res.status(400).json({ error: "Student ID and Class ID are required" });
    }

    const [student] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, String(studentId)), eq(user.role, "student")));

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const [classRecord] = await db
      .select({ id: classes.id, capacity: classes.capacity, teacherId: classes.teacherId })
      .from(classes)
      .where(eq(classes.id, numericClassId));

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (req.user?.role === "teacher" && classRecord.teacherId !== req.user.id) {
      return res.status(403).json({ error: "Teachers can only enroll students in their own classes" });
    }

    const [enrollmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.classId, numericClassId));

    if (Number(enrollmentCount?.count ?? 0) >= classRecord.capacity) {
      return res.status(409).json({ error: "Class capacity is full" });
    }

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ studentId: String(studentId), classId: numericClassId })
      .returning({ id: enrollments.id });

    if (!createdEnrollment) throw Error;

    res.status(201).json({ data: createdEnrollment });
  } catch (error: any) {
    console.error("POST /enrollments error:", error);
    // Handle unique constraint violation (student already enrolled in class)
    if (error.code === '23505') {
       return res.status(409).json({ error: "Student is already enrolled in this class" });
    }
    res.status(500).json({ error: "Failed to create enrollment" });
  }
});

// Delete an enrollment
router.delete("/:id", async (req, res) => {
  try {
    const enrollmentId = Number(req.params.id);

    if (!Number.isFinite(enrollmentId)) {
      return res.status(400).json({ error: "Invalid enrollment id" });
    }

    const [enrollment] = await db
      .select({ id: enrollments.id, teacherId: classes.teacherId })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.id, enrollmentId));

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    if (req.user?.role === "teacher" && enrollment.teacherId !== req.user.id) {
      return res.status(403).json({ error: "Teachers can only remove enrollments from their own classes" });
    }

    const [deletedEnrollment] = await db
      .delete(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .returning({ id: enrollments.id });

    if (!deletedEnrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    res.status(200).json({ data: deletedEnrollment });
  } catch (error) {
    console.error("DELETE /enrollments/:id error:", error);
    res.status(500).json({ error: "Failed to delete enrollment" });
  }
});

export default router;
