import express from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { user } from "../schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, Number(page));
    const limitPerPage = Math.max(1, Number(limit));
    const offset = (currentPage - 1) * limitPerPage;
    const conditions = [eq(user.role, "teacher")];

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

    const faculty = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        imageCldPubId: user.imageCldPubId,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(limitPerPage)
      .offset(offset);

    return res.json({
      data: faculty,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total,
        totalPages: Math.ceil(total / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /faculty error:", error);
    return res.status(500).json({ error: "Failed to fetch faculty" });
  }
});

export default router;
