import express from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { user } from "../schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 100 } = req.query;
    const currentPage = Math.max(1, Number(page));
    const limitPerPage = Math.max(1, Number(limit));
    const offset = (currentPage - 1) * limitPerPage;
    const conditions = [eq(user.role, "student")];

    if (search) {
      conditions.push(
        or(
          ilike(user.name, `%${String(search)}%`),
          ilike(user.email, `%${String(search)}%`)
        ) as never
      );
    }

    const whereClause = and(...conditions);
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);
    const students = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.name), desc(user.id))
      .limit(limitPerPage)
      .offset(offset);

    return res.json({
      data: students,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total,
        totalPages: Math.ceil(total / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /students error:", error);
    return res.status(500).json({ error: "Failed to fetch students" });
  }
});

export default router;