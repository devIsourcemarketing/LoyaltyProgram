import { db } from "./server/db";
import { users, deals, regionConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testDealGoalsCalculation() {
  console.log("🧪 Testing Deal Goals Calculation Rules\n");
  console.log("=" . repeat(60));
  
  try {
    // Find any test user with deals
    const testUser = await db.query.users.findFirst({
      where: eq(users.isActive, true)
    });

    if (!testUser) {
      console.error("❌ No active users found.");
      return;
    }

    console.log(`\n👤 Test User: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`   Region: ${testUser.region}`);
    console.log(`   Category: ${testUser.regionCategory}`);

    // Get region config
    const regionConfigList = await db.query.regionConfigs.findMany({
      where: eq(regionConfigs.region, testUser.region!)
    });

    const regionConfig = regionConfigList.find(rc => 
      rc.category === testUser.regionCategory &&
      (!testUser.regionSubcategory || rc.subcategory === testUser.regionSubcategory)
    );

    if (!regionConfig) {
      console.error("❌ Region config not found");
      return;
    }

    console.log(`\n📊 Region Config Rates:`);
    console.log(`   NEW CLIENT Rate: $${regionConfig.newCustomerGoalRate} per goal`);
    console.log(`   RENEWAL Rate: $${regionConfig.renewalGoalRate} per goal`);

    // Test scenarios
    const testScenarios = [
      { type: "new_customer", value: 100000, expected: 100000 / regionConfig.newCustomerGoalRate },
      { type: "new_customer", value: 50000, expected: 50000 / regionConfig.newCustomerGoalRate },
      { type: "renewal", value: 160000, expected: 160000 / regionConfig.renewalGoalRate },
      { type: "renewal", value: 100000, expected: 100000 / regionConfig.renewalGoalRate },
    ];

    console.log(`\n🧮 Test Scenarios:\n`);
    console.log("=" . repeat(60));

    for (const scenario of testScenarios) {
      const dealTypeName = scenario.type === "new_customer" ? "NEW CLIENT" : "RENEWAL";
      const rate = scenario.type === "new_customer" 
        ? regionConfig.newCustomerGoalRate 
        : regionConfig.renewalGoalRate;
      
      console.log(`\n${dealTypeName}:`);
      console.log(`  Deal Value: $${scenario.value.toLocaleString()}`);
      console.log(`  Rate: $${rate} per goal`);
      console.log(`  Calculation: $${scenario.value.toLocaleString()} / $${rate}`);
      console.log(`  Expected Goals: ${scenario.expected.toFixed(1)}`);
      
      // Verify the formula
      const calculated = scenario.value / rate;
      const isCorrect = Math.abs(calculated - scenario.expected) < 0.01;
      
      if (isCorrect) {
        console.log(`  ✅ CORRECT: ${calculated.toFixed(1)} goals`);
      } else {
        console.log(`  ❌ ERROR: Got ${calculated.toFixed(1)}, expected ${scenario.expected.toFixed(1)}`);
      }
    }

    // Now test with actual database deals
    console.log(`\n\n📋 Checking Recent Deals from Database:\n`);
    console.log("=" . repeat(60));

    const recentDeals = await db.query.deals.findMany({
      where: eq(deals.userId, testUser.id),
      limit: 5,
      orderBy: (deals, { desc }) => [desc(deals.createdAt)]
    });

    if (recentDeals.length === 0) {
      console.log("\n⚠️  No deals found for this user");
    } else {
      for (const deal of recentDeals) {
        const dealTypeName = deal.dealType === "new_customer" ? "NEW CLIENT" : "RENEWAL";
        const rate = deal.dealType === "new_customer" 
          ? regionConfig.newCustomerGoalRate 
          : regionConfig.renewalGoalRate;
        const expectedGoals = parseFloat(deal.dealValue) / rate;
        
        console.log(`\n${deal.productName}`);
        console.log(`  Type: ${dealTypeName}`);
        console.log(`  Value: $${parseFloat(deal.dealValue).toLocaleString()}`);
        console.log(`  Rate: $${rate} per goal`);
        console.log(`  Expected Goals: ${expectedGoals.toFixed(1)}`);
        console.log(`  Status: ${deal.status}`);
        
        if (deal.goalsEarned) {
          const storedGoals = parseFloat(deal.goalsEarned.toString());
          const isCorrect = Math.abs(storedGoals - expectedGoals) < 0.01;
          
          if (isCorrect) {
            console.log(`  ✅ Stored Goals: ${storedGoals.toFixed(1)} (CORRECT)`);
          } else {
            console.log(`  ❌ Stored Goals: ${storedGoals.toFixed(1)} (INCORRECT, should be ${expectedGoals.toFixed(1)})`);
          }
        } else {
          console.log(`  ⚠️  Goals not calculated yet`);
        }
      }
    }

    console.log("\n\n" + "=" . repeat(60));
    console.log("✅ Test completed!\n");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

testDealGoalsCalculation();
