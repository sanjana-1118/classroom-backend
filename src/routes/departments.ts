import express from "express";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { departments } from "../schema/index.js";

const router = express.Router();

// Get all departments with optional search and pagination
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(departments.name, `%${search}%`),
          ilike(departments.code, `%${search}%`)
        )
      );
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(departments)
      .where(whereClause);

    const totalCount = Number(countResult[0]?.count ?? 0);

    const departmentsList = await db
      .select()
      .from(departments)
      .where(whereClause)
      .orderBy(desc(departments.createdAt), desc(departments.id))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: departmentsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /departments error:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const [createdDepartment] = await db
      .insert(departments)
      .values({ name, code, description })
      .returning({ id: departments.id });

    if (!createdDepartment) throw Error;

    res.status(201).json({ data: createdDepartment });
  } catch (error) {
    console.error("POST /departments error:", error);
    res.status(500).json({ error: "Failed to create department" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const departmentId = Number(req.params.id);

    if (!Number.isFinite(departmentId)) {
      return res.status(400).json({ error: "Invalid department id" });
    }

    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, departmentId));

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.status(200).json({
      data: department,
    });
  } catch (error) {
    console.error("GET /departments/:id error:", error);
    res.status(500).json({ error: "Failed to fetch department details" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const departmentId = Number(req.params.id);
    const { name, code, description } = req.body;

    if (!Number.isFinite(departmentId)) {
      return res.status(400).json({ error: "Invalid department id" });
    }

    const [updatedDepartment] = await db
      .update(departments)
      .set({ name, code, description })
      .where(eq(departments.id, departmentId))
      .returning({ id: departments.id });

    if (!updatedDepartment) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.status(200).json({ data: updatedDepartment });
  } catch (error) {
    console.error("PATCH /departments/:id error:", error);
    res.status(500).json({ error: "Failed to update department" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const departmentId = Number(req.params.id);

    if (!Number.isFinite(departmentId)) {
      return res.status(400).json({ error: "Invalid department id" });
    }

    const [deletedDepartment] = await db
      .delete(departments)
      .where(eq(departments.id, departmentId))
      .returning({ id: departments.id });

    if (!deletedDepartment) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.status(200).json({ data: deletedDepartment });
  } catch (error) {
    console.error("DELETE /departments/:id error:", error);
    res.status(500).json({ error: "Failed to delete department" });
  }
});

export default router;
