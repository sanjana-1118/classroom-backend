import { db } from "../src/db/index.js";
import { account, user } from "../src/schema/auth.js";
import { eq } from "drizzle-orm";

async function main() {
    const data = await db.select({
        email: user.email,
        hasPassword: account.password
    }).from(user)
      .leftJoin(account, eq(user.id, account.userId));
    
    console.log(data.map(d => ({ email: d.email, hasPassword: !!d.hasPassword })));
    process.exit(0);
}

main();
