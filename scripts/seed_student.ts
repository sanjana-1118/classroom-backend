import { db } from "../src/db/index.js";
import { user } from "../src/schema/index.js";
import crypto from "crypto";

async function main() {
  try {
    console.log("Seeding student...");
    await db.insert(user).values({
      id: crypto.randomUUID(),
      name: "Test Student",
      email: "student@example.com",
      role: "student",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Student seeded successfully!");
  } catch (error) {
    console.error("Failed to seed student:", error);
  } finally {
    process.exit(0);
  }
}

main();
