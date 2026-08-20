import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../lib/auth.js";

type Role = "admin" | "teacher" | "student";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return res.status(403).json({ error: "Authentication required" });
    }

    req.user = {
      id: session.user.id,
      role: session.user.role as Role,
    };

    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(403).json({ error: "Authentication required" });
  }
};

export const requireRole = (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };

export const requireRoleForMethods = (methods: string[], ...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!methods.includes(req.method)) return next();
    return requireRole(...roles)(req, res, next);
  };