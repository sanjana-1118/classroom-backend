import express from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { user } from "../schema/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const [profile] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId));

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  return res.json({ data: profile });
});

export default router;