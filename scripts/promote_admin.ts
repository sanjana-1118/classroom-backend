import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";

async function makeAdmin() {
  const email = "admin@example.com";
  
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (!existingUser) {
    console.log("Creating new admin user...");
    // better-auth doesn't expose a straightforward server-side signup via DB without calling API usually,
    // so let's just update an existing user if we have their email, OR let's ask the user to sign up as admin@example.com
    // first and then promote them.
  } else {
    await db.update(users).set({ role: "admin" }).where(eq(users.email, email));
    console.log("Promoted existing user to admin.");
  }
}

makeAdmin().then(() => process.exit(0)).catch(console.error);
