import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { user } from './schema/auth.js';

async function main() {
  try {
    console.log('Performing CRUD operations...');

    const [newUser] = await db
      .insert(user)
      .values({
        id: 'demo-user',
        name: 'Admin User',
        email: 'admin@example.com',
        emailVerified: true,
        role: 'admin',
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    console.log('✅ CREATE: New user created:', newUser);

    const foundUsers = await db.select().from(user).where(eq(user.id, newUser.id));
    console.log('✅ READ: Found user:', foundUsers[0]);

    const [updatedUser] = await db
      .update(user)
      .set({ name: 'Super Admin' })
      .where(eq(user.id, newUser.id))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    console.log('✅ UPDATE: User updated:', updatedUser);

    await db.delete(user).where(eq(user.id, newUser.id));
    console.log('✅ DELETE: User deleted.');

    console.log('\nCRUD operations completed successfully.');
  } catch (error) {
    console.error('❌ Error performing CRUD operations:', error);
    process.exit(1);
  }
}

void main();
