import { db } from "./server/db";
import { users, deals, goalsHistory, regionConfigs } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

async function registerMissingGoals() {
  console.log("🔧 Registering missing goals in goalsHistory\n");
  console.log("=" . repeat(60));
  
  try {
    const testUser = await db.query.users.findFirst({
      where: eq(users.email, "alejandrosoftware.engineering@gmail.com")
    });

    if (!testUser) {
      console.error("❌ Test user not found.");
      return;
    }

    console.log(`👤 User: ${testUser.firstName} ${testUser.lastName}`);

    // Get region config for the user
    const [regionConfig] = await db
      .select()
      .from(regionConfigs)
      .where(
        and(
          eq(regionConfigs.region, testUser.region!),
          eq(regionConfigs.category, testUser.regionCategory!),
          testUser.regionSubcategory 
            ? eq(regionConfigs.subcategory, testUser.regionSubcategory)
            : isNull(regionConfigs.subcategory)
        )
      )
      .limit(1);

    if (!regionConfig) {
      console.error("❌ No region config found for user");
      return;
    }

    console.log(`📊 Region Config: ${regionConfig.region} - ${regionConfig.category}`);
    console.log(`   NEW CLIENT Rate: $${regionConfig.newCustomerGoalRate} per goal`);
    console.log(`   RENEWAL Rate: $${regionConfig.renewalGoalRate} per goal\n`);

    // Get all approved deals that don't have goals history
    const allDeals = await db.query.deals.findMany({
      where: eq(deals.userId, testUser.id)
    });

    // Check which deals are missing from goals history
    const existingGoalsHistory = await db.query.goalsHistory.findMany({
      where: eq(goalsHistory.userId, testUser.id)
    });

    const dealsWithGoals = new Set(existingGoalsHistory.map(g => g.dealId));
    const dealsToRegister = allDeals.filter(d => 
      d.status === "approved" && !dealsWithGoals.has(d.id)
    );

    console.log(`Found ${dealsToRegister.length} deals without goals history\n`);

    let totalGoalsRegistered = 0;

    for (const deal of dealsToRegister) {
      const dealValue = parseFloat(deal.dealValue);
      const goalRate = deal.dealType === "new_customer" 
        ? regionConfig.newCustomerGoalRate 
        : regionConfig.renewalGoalRate;
      const goalsEarned = dealValue / goalRate;
      
      const transactionDate = new Date(deal.closeDate);
      
      await db.insert(goalsHistory).values({
        userId: testUser.id,
        dealId: deal.id,
        goals: goalsEarned.toFixed(2),
        month: transactionDate.getMonth() + 1,
        year: transactionDate.getFullYear(),
        regionConfigId: regionConfig.id,
        description: `${goalsEarned.toFixed(2)} goals from ${deal.dealType === "new_customer" ? "new customer" : "renewal"} deal: ${deal.productName}`,
      });

      totalGoalsRegistered += goalsEarned;

      const dealTypeName = deal.dealType === "new_customer" ? "NEW CLIENT" : "RENEWAL";
      console.log(`✅ Registered ${dealTypeName}: ${deal.productName}`);
      console.log(`   Value: $${dealValue.toLocaleString()}, Goals: ${goalsEarned.toFixed(1)}`);
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ Successfully registered ${totalGoalsRegistered.toFixed(1)} goals for ${dealsToRegister.length} deals!`);
    
    // Verify total
    const [totalGoalsResult] = await db
      .select({ total: db.$sum(goalsHistory.goals) })
      .from(goalsHistory)
      .where(eq(goalsHistory.userId, testUser.id));

    console.log(`📊 Total goals in goalsHistory now: ${Number(totalGoalsResult?.total || 0).toFixed(1)}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

registerMissingGoals();
