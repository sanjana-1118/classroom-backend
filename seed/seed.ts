import 'dotenv/config';
import { db } from '../src/db/index.js';
import { user } from '../src/schema/index.js';

async function main() {
  try {
    const id = `teacher-tom-${Date.now()}`;

    const [created] = await db
      .insert(user)
      .values({
        id,
        name: 'Tom',
        email: `tom+${Date.now()}@example.com`,
        emailVerified: true,
        role: 'teacher',
      })
      .returning();

    if (!created) {
      console.error('Failed to create teacher');
      process.exit(1);
    }

    console.log('Created teacher:', created);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding teacher:', err);
    process.exit(1);
  }
}

void main();
