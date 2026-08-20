import { db } from "../src/db/index.js";
import { user } from "../src/schema/index.js";
import { eq } from "drizzle-orm";

async function createAdmin() {
    const email = "admin99@example.com";
    const password = "password123";

    try {
        console.log("Creating user via backend API...");
        const res = await fetch("http://127.0.0.1:8080/api/auth/sign-up/email", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Origin": "http://localhost:5173"
            },
            body: JSON.stringify({
                email,
                password,
                name: "Admin Superuser"
            })
        });

        const data = await res.json();
        console.log("Signup response:", res.status, data);

        if (res.status === 200 || data.user || data.error?.code === "USER_ALREADY_EXISTS") {
            await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
            console.log("Promoted to admin successfully!");
            console.log(`\n\n✅ YOU CAN NOW LOG IN WITH:\nEmail: ${email}\nPassword: ${password}\n\n`);
        } else {
             console.log("Failed to register.");
        }
    } catch (e) {
        console.error("Failed:", e);
    } 
}

createAdmin().then(() => process.exit(0));
