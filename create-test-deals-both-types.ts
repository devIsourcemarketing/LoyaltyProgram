import { db } from "./server/db";
import { users, deals } from "@shared/schema";
import { eq } from "drizzle-orm";

async function createTestDeals() {
  console.log("🧪 Creating test deals with both NEW CLIENT and RENEWAL types\n");
  console.log("=" . repeat(60));
  
  try {
    // Find test user
    const testUser = await db.query.users.findFirst({
      where: eq(users.email, "alejandrosoftware.engineering@gmail.com")
    });

    if (!testUser) {
      console.error("❌ Test user not found.");
      return;
    }

    console.log(`\n👤 Test User: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Region: ${testUser.region} - ${testUser.regionCategory}`);

    // Test deals to create
    const testDeals = [
      // NEW CLIENT deals (should calculate with $1,000 rate)
      {
        dealType: "new_customer" as const,
        productName: "NEW CLIENT - Deal #12345",
        dealValue: "50000.00",
        expectedGoals: 50.0,
        closeDate: new Date("2025-12-01")
      },
      {
        dealType: "new_customer" as const,
        productName: "NEW CLIENT - Deal #12346",
        dealValue: "100000.00",
        expectedGoals: 100.0,
        closeDate: new Date("2025-12-02")
      },
      {
        dealType: "new_customer" as const,
        productName: "NEW CLIENT - Deal #12347",
        dealValue: "25000.00",
        expectedGoals: 25.0,
        closeDate: new Date("2025-12-03")
      },
      
      // RENEWAL deals (should calculate with $2,000 rate)
      {
        dealType: "renewal" as const,
        productName: "RENEWAL - Deal #23456",
        dealValue: "100000.00",
        expectedGoals: 50.0,
        closeDate: new Date("2025-12-01")
      },
      {
        dealType: "renewal" as const,
        productName: "RENEWAL - Deal #23457",
        dealValue: "160000.00",
        expectedGoals: 80.0,
        closeDate: new Date("2025-12-02")
      },
      {
        dealType: "renewal" as const,
        productName: "RENEWAL - Deal #23458",
        dealValue: "200000.00",
        expectedGoals: 100.0,
        closeDate: new Date("2025-12-03")
      },
      {
        dealType: "renewal" as const,
        productName: "RENEWAL - Deal #23459",
        dealValue: "80000.00",
        expectedGoals: 40.0,
        closeDate: new Date("2025-12-04")
      },
    ];

    console.log(`\n📝 Creating ${testDeals.length} test deals...\n`);

    for (const dealData of testDeals) {
      const dealTypeName = dealData.dealType === "new_customer" ? "NEW CLIENT" : "RENEWAL";
      const rate = dealData.dealType === "new_customer" ? 1000 : 2000;
      
      const newDeal = await db.insert(deals).values({
        userId: testUser.id,
        productType: "software",
        dealType: dealData.dealType,
        productName: dealData.productName,
        dealValue: dealData.dealValue,
        quantity: 1,
        closeDate: dealData.closeDate,
        clientInfo: `Test deal created for validation`,
        status: "approved",
        pointsEarned: 0,
        goalsEarned: dealData.expectedGoals.toString(),
      }).returning();

      console.log(`✅ Created ${dealTypeName}:`);
      console.log(`   Product: ${dealData.productName}`);
      console.log(`   Value: $${parseFloat(dealData.dealValue).toLocaleString()}`);
      console.log(`   Rate: $${rate} per goal`);
      console.log(`   Expected Goals: ${dealData.expectedGoals}`);
      console.log(`   Close Date: ${dealData.closeDate.toISOString().split('T')[0]}`);
      console.log(``);
    }

    console.log("=" . repeat(60));
    console.log(`✅ Successfully created ${testDeals.length} test deals!`);
    console.log(`\nSummary:`);
    console.log(`  - 3 NEW CLIENT deals (rate: $1,000 per goal)`);
    console.log(`  - 4 RENEWAL deals (rate: $2,000 per goal)`);
    console.log(`\nTotal expected goals: ${testDeals.reduce((sum, d) => sum + d.expectedGoals, 0)}`);
    console.log(`\nNow check the user dashboard to see both types of deals!`);

  } catch (error) {
    console.error("❌ Error creating test deals:", error);
  } finally {
    process.exit(0);
  }
}

createTestDeals();
