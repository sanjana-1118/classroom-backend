import { db } from "../src/db/index.js";
import { user } from "../src/schema/index.js";
import { enrollments } from "../src/schema/index.js";

async function main() {
  const users = await db.select().from(user);
  if (users.length > 0) {
    await db.insert(enrollments).values({
      classId: 1,
      studentId: users[0].id
    });
    console.log("Enrolled", users[0].id);
  }
}

main();
