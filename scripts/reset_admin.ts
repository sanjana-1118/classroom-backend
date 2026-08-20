import { db } from "../src/db/index.js";
import { account, user } from "../src/schema/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs"; 

async function resetAdminPassword() {
    const email = "classroom.admin.1787150152@example.com";
    const newPassword = "password123";
    
    try {
        console.log(`Resetting password for ${email}...`);
        
        // Find user
        const existingUsers = await db.select().from(user).where(eq(user.email, email));
        
        if (existingUsers.length === 0) {
            console.log("Admin user not found!");
            return;
        }
        
        const existingUser = existingUsers[0];
        
        // Generate hash
        const hash = bcrypt.hashSync(newPassword, 10);
        
        // Update account table
        await db.update(account).set({ password: hash }).where(eq(account.userId, existingUser.id));
        
        console.log(`Successfully reset password for ${email} to ${newPassword}`);
    } catch (e) {
        console.error("Failed:", e);
    }
}

resetAdminPassword().then(() => process.exit(0));
