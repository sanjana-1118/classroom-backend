import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../schema/index.js";

const router = express.Router();

// Get all classes with optional search, subject, teacher filters, and pagination
router.get("/", async (req, res) => {
  try {
    const { search, subject, teacher, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(classes.name, `%${search}%`),
          ilike(classes.inviteCode, `%${search}%`)
        )
      );
    }

    if (subject) {
      filterConditions.push(ilike(subjects.name, `%${subject}%`));
    }

    if (teacher) {
      filterConditions.push(ilike(user.name, `%${teacher}%`));
    }

    if (req.user?.role === "student") {
      filterConditions.push(
        sql`${classes.id} IN (SELECT ${enrollments.classId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${req.user.id})`
      );
    } else if (req.user?.role === "teacher") {
      filterConditions.push(eq(classes.teacherId, req.user.id ?? ""));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // 1. Calculate Total Records for Refine Pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause);

    const totalCount = Number(countResult[0]?.count ?? 0);

    // 2. Fetch the Data Rows
    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        teacher: {
          ...getTableColumns(user),
        },
        enrollmentCount: sql<number>`(
          SELECT count(*) FROM ${enrollments}
          WHERE ${enrollments.classId} = ${classes.id}
        )`.mapWith(Number),
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(classes.createdAt), desc(classes.id))
      .limit(limitPerPage)
      .offset(offset);

    // 3. Send Response structured exactly how frontend dataProvider.mapResponse wants it
    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes error:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Create a new class
router.post("/", async (req, res) => {
  try {
    const {
      name,
      teacherId,
      subjectId,
      capacity,
      description,
      status,
      bannerUrl,
      bannerCldPubId,
      schedules,
    } = req.body;

    const [createdClass] = await db
      .insert(classes)
      .values({
        subjectId,
        inviteCode: Math.random().toString(36).substring(2, 9),
        name,
        teacherId,
        bannerCldPubId,
        bannerUrl,
        capacity,
        description,
        schedules: Array.isArray(schedules) ? schedules : [],
        status,
      })
      .returning({ id: classes.id });

    if (!createdClass) throw Error;

    res.status(201).json({ data: createdClass });
  } catch (error) {
    console.error("POST /classes error:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Get single class details with counts
router.get("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    const accessCondition =
      req.user?.role === "student"
        ? sql`${classes.id} IN (SELECT ${enrollments.classId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${req.user.id})`
        : req.user?.role === "teacher"
          ? eq(classes.teacherId, req.user.id ?? "")
          : undefined;

    const [classDetails] = await db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        department: {
          ...getTableColumns(departments),
        },
        teacher: {
          ...getTableColumns(user),
        },
        enrollmentCount: sql<number>`(
          SELECT count(*) FROM ${enrollments}
          WHERE ${enrollments.classId} = ${classes.id}
        )`.mapWith(Number),
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(and(eq(classes.id, classId), accessCondition));

    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.status(200).json({ data: classDetails });
  } catch (error) {
    console.error("GET /classes/:id error:", error);
    res.status(500).json({ error: "Failed to fetch class details" });
  }
});

// List users in a class by role with pagination
router.get("/:id/users", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    if (req.user?.role === "student") {
      return res.status(403).json({ error: "Students cannot access class user lists" });
    }

    if (req.user?.role === "teacher") {
      const [ownedClass] = await db
        .select({ id: classes.id })
        .from(classes)
        .where(and(eq(classes.id, classId), eq(classes.teacherId, req.user.id ?? "")));

      if (!ownedClass) {
        return res.status(403).json({ error: "Teachers can only access their own class users" });
      }
    }

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const baseSelect = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      imageCldPubId: user.imageCldPubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const groupByFields = [
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.image,
      user.role,
      user.imageCldPubId,
      user.createdAt,
      user.updatedAt,
    ];

    const countResult =
      role === "teacher"
        ? await db
          .select({ count: sql<number>`count(distinct ${user.id})` })
          .from(user)
          .leftJoin(classes, eq(user.id, classes.teacherId))
          .where(and(eq(user.role, role), eq(classes.id, classId)))
        : await db
          .select({ count: sql<number>`count(distinct ${user.id})` })
          .from(user)
          .leftJoin(enrollments, eq(user.id, enrollments.studentId))
          .where(and(eq(user.role, role), eq(enrollments.classId, classId)));

    const totalCount = Number(countResult[0]?.count ?? 0);

    const usersList =
      role === "teacher"
        ? await db
          .select(baseSelect)
          .from(user)
          .leftJoin(classes, eq(user.id, classes.teacherId))
          .where(and(eq(user.role, role), eq(classes.id, classId)))
          .groupBy(...groupByFields)
          .orderBy(desc(user.createdAt), desc(user.id))
          .limit(limitPerPage)
          .offset(offset)
        : await db
          .select(baseSelect)
          .from(user)
          .leftJoin(enrollments, eq(user.id, enrollments.studentId))
          .where(and(eq(user.role, role), eq(enrollments.classId, classId)))
          .groupBy(...groupByFields)
          .orderBy(desc(user.createdAt), desc(user.id))
          .limit(limitPerPage)
          .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes/:id/users error:", error);
    res.status(500).json({ error: "Failed to fetch class users" });
  }
});

// Update a class
router.patch("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    const {
      name,
      teacherId,
      subjectId,
      capacity,
      description,
      status,
      bannerUrl,
      bannerCldPubId,
      schedules,
    } = req.body;

    const updateData: any = {
      name,
      teacherId,
      subjectId,
      capacity,
      description,
      status,
      bannerUrl,
      bannerCldPubId,
    };
    if (schedules !== undefined) {
      updateData.schedules = Array.isArray(schedules) ? schedules : [];
    }

    const [updatedClass] = await db
      .update(classes)
      .set(updateData)
      .where(eq(classes.id, classId))
      .returning();

    if (!updatedClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.status(200).json({ data: updatedClass });
  } catch (error) {
    console.error("PATCH /classes/:id error:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

// Delete a class
router.delete("/:id", async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    const [deletedClass] = await db
      .delete(classes)
      .where(eq(classes.id, classId))
      .returning();

    if (!deletedClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.status(200).json({ data: deletedClass });
  } catch (error) {
    console.error("DELETE /classes/:id error:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

export default router;