import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js";
import * as schema from "../schema/auth.js";

const frontendUrl = (process.env.FRONTEND_URL ?? "").replace(/\/$/, "");
const baseUrl = (process.env.BETTER_AUTH_URL ?? "https://classroom-backend-omega.vercel.app").replace(/\/$/, "");
const trustedOrigins = [
  frontendUrl,
  "https://classroom-frontend-umber-beta.vercel.app",
  ...Array.from({ length: 10 }, (_, index) => `http://localhost:${5173 + index}`),
].filter((origin, index, origins) => origins.indexOf(origin) === index);

export const auth = betterAuth({
  baseURL: baseUrl,
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret",
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const requestedRole = user.role;

          if (requestedRole === "admin") {
            throw new Error("Admin accounts cannot be created through registration");
          }

          return {
            data: {
              ...user,
              role: requestedRole === "teacher" ? "teacher" : "student",
            },
          };
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: true,
      },
      imageCldPubId: {
        type: "string",
        required: false,
        input: true, // Allow imageCldPubId to be set during registration
      },
    },
  },
});