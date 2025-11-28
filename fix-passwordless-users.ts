import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq, like } from "drizzle-orm";

async function fixPasswordlessUsers() {
  console.log("🔧 Actualizando usuarios passwordless...");
  
  try {
    // Actualizar usuarios con username que empieza con "user_" a isPasswordless = true
    const result = await db
      .update(users)
      .set({ isPasswordless: true })
      .where(like(users.username, "user_%"))
      .returning({ id: users.id, username: users.username, email: users.email });
    
    console.log(`✅ ${result.length} usuarios actualizados a passwordless:`);
    result.forEach(user => {
      console.log(`   - ${user.email} (${user.username})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixPasswordlessUsers();
