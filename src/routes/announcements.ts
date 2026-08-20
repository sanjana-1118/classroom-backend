import express from "express";
import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { announcements, classes, enrollments, user } from "../schema/index.js";

const router = express.Router();

const accessibleClassCondition = (req: express.Request) => {
  if (req.user?.role === "teacher") {
    return eq(classes.teacherId, req.user.id ?? "");
  }

  if (req.user?.role === "student") {
    return sql`${classes.id} IN (SELECT ${enrollments.classId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${req.user.id})`;
  }

  return undefined;
};

router.get("/", async (req, res) => {
  try {
    const { classId, page = 1, limit = 20 } = req.query;
    const currentPage = Math.max(1, Number(page));
    const limitPerPage = Math.max(1, Number(limit));
    const offset = (currentPage - 1) * limitPerPage;
    const conditions = [];

    if (classId) conditions.push(eq(announcements.classId, Number(classId)));
    const access = accessibleClassCondition(req);
    if (access) conditions.push(access);
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(announcements)
      .innerJoin(classes, eq(announcements.classId, classes.id))
      .where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);

    const rows = await db
      .select({
        ...getTableColumns(announcements),
        author: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        class: {
          id: classes.id,
          name: classes.name,
        },
      })
      .from(announcements)
      .innerJoin(classes, eq(announcements.classId, classes.id))
      .innerJoin(user, eq(announcements.authorId, user.id))
      .where(whereClause)
      .orderBy(desc(announcements.createdAt), desc(announcements.id))
      .limit(limitPerPage)
      .offset(offset);

    return res.json({
      data: rows,
      pagination: { page: currentPage, limit: limitPerPage, total, totalPages: Math.ceil(total / limitPerPage) },
    });
  } catch (error) {
    console.error("GET /announcements error:", error);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/", async (req, res) => {
  try {
    if (req.user?.role === "student") {
      return res.status(403).json({ error: "Students cannot create announcements" });
    }

    const { title, content, classId } = req.body;
    const numericClassId = Number(classId);
    if (!title?.trim() || !content?.trim() || !Number.isInteger(numericClassId)) {
      return res.status(400).json({ error: "Title, content, and class ID are required" });
    }

    const access = accessibleClassCondition(req);
    const classConditions = [eq(classes.id, numericClassId)];
    if (access) classConditions.push(access);
    const [targetClass] = await db.select({ id: classes.id }).from(classes).where(and(...classConditions));
    if (!targetClass) return res.status(403).json({ error: "Class is not accessible" });

    const [created] = await db.insert(announcements).values({
      title: title.trim(),
      content: content.trim(),
      classId: numericClassId,
      authorId: req.user?.id ?? "",
    }).returning();

    return res.status(201).json({ data: created });
  } catch (error) {
    console.error("POST /announcements error:", error);
    return res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (req.user?.role === "student") return res.status(403).json({ error: "Students cannot edit announcements" });
    const announcementId = Number(req.params.id);
    const access = accessibleClassCondition(req);
    const conditions = [eq(announcements.id, announcementId)];
    if (access) conditions.push(access);
    const [updated] = await db.update(announcements).set({
      title: String(req.body.title ?? "").trim(),
      content: String(req.body.content ?? "").trim(),
    }).where(and(...conditions)).returning();
    if (!updated) return res.status(404).json({ error: "Announcement not found" });
    return res.json({ data: updated });
  } catch (error) {
    console.error("PATCH /announcements error:", error);
    return res.status(500).json({ error: "Failed to update announcement" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.user?.role === "student") return res.status(403).json({ error: "Students cannot delete announcements" });
    const announcementId = Number(req.params.id);
    const access = accessibleClassCondition(req);
    const conditions = [eq(announcements.id, announcementId)];
    if (access) conditions.push(access);
    const [deleted] = await db.delete(announcements).where(and(...conditions)).returning({ id: announcements.id });
    if (!deleted) return res.status(404).json({ error: "Announcement not found" });
    return res.json({ data: deleted });
  } catch (error) {
    console.error("DELETE /announcements error:", error);
    return res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;