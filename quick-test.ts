import { db } from "./server/db";
import { users, goalsHistory } from "@shared/schema";
import { eq, sum } from "drizzle-orm";
import { DatabaseStorage } from "./server/storage";

async function quickTest() {
  const testUser = await db.query.users.findFirst({
    where: eq(users.email, "alejandrosoftware.engineering@gmail.com")
  });

  if (!testUser) {
    console.error("❌ User not found");
    process.exit(1);
  }

  // Test goalsHistory total
  const [totalGoalsResult] = await db
    .select({ total: sum(goalsHistory.goals) })
    .from(goalsHistory)
    .where(eq(goalsHistory.userId, testUser.id));

  const totalGoalsInDB = Number(totalGoalsResult?.total || 0);

  // Test getUserStats
  const storage = new DatabaseStorage();
  const stats = await storage.getUserStats(testUser.id);

  console.log("🔍 Quick Test Results:");
  console.log("=" . repeat(50));
  console.log(`Total goals in goalsHistory: ${totalGoalsInDB.toFixed(1)}`);
  console.log(`getUserStats totalGoals: ${stats.totalGoals?.toFixed(1) || 'N/A'}`);
  console.log(`getUserStats monthlyGoals: ${stats.monthlyGoals?.toFixed(1) || 'N/A'}`);
  console.log("=" . repeat(50));
  
  if (totalGoalsInDB > 400 && stats.totalGoals && stats.totalGoals > 400) {
    console.log("✅ SUCCESS - Total goals is correct!");
  } else {
    console.log("❌ FAIL - Total goals is incorrect");
  }

  process.exit(0);
}

quickTest();
