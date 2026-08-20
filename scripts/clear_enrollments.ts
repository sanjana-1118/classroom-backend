import { db } from "../src/db/index.js";
import { enrollments } from "../src/schema/index.js";

async function main() {
  try {
    console.log("Truncating enrollments...");
    await db.delete(enrollments);
    console.log("Enrollments truncated successfully!");
  } catch (error) {
    console.error("Failed to truncate enrollments:", error);
  } finally {
    process.exit(0);
  }
}

main();
