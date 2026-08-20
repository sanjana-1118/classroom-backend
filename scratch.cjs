const fs = require('fs');
const content = fs.readFileSync('src/routes/users.ts', 'utf8');
const patched = content.replace(
  /const { role } = req\.body;[\s\S]*?\.returning\(\);/,
  `const { role, name, email } = req.body;

    if (role && role !== "student" && role !== "teacher" && role !== "admin") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, userId))
      .returning();`
);
fs.writeFileSync('src/routes/users.ts', patched);
