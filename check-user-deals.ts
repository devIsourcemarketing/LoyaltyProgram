import { storage } from "./server/storage";
import { db } from "./server/db";
import { goalsHistory, deals } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function checkUserDeals() {
  const targetEmail = "alejandrosoftware.engineering@gmail.com";
  
  // Get user by email
  const user = await storage.getUserByEmail(targetEmail);
  
  if (!user) {
    console.log(`❌ Usuario ${targetEmail} no encontrado`);
    process.exit(1);
  }
  
  console.log(`\n👤 Usuario: ${user.firstName} ${user.lastName}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   ID: ${user.id}\n`);
  
  // Get all deals for this user
  const userDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.userId, user.id));
  
  console.log(`📝 Total de deals: ${userDeals.length}\n`);
  
  // Get current month/year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  console.log(`📅 Mes actual: ${currentMonth}/${currentYear}\n`);
  
  // Check each deal
  for (const deal of userDeals) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Deal ID: ${deal.id}`);
    console.log(`Producto: ${deal.productName}`);
    console.log(`Valor: $${deal.dealValue}`);
    console.log(`Tipo: ${deal.dealType}`);
    console.log(`Fecha de cierre: ${deal.closeDate}`);
    console.log(`Estado: ${deal.status}`);
    console.log(`Goles ganados (en deal): ${deal.goalsEarned || '0'}`);
    
    const closeDate = new Date(deal.closeDate);
    const dealMonth = closeDate.getMonth() + 1;
    const dealYear = closeDate.getFullYear();
    console.log(`Mes/Año del deal: ${dealMonth}/${dealYear}`);
    
    // Check if this deal has goals_history
    const goalsRecords = await db
      .select()
      .from(goalsHistory)
      .where(eq(goalsHistory.dealId, deal.id));
    
    if (goalsRecords.length > 0) {
      console.log(`✅ Tiene registro en goals_history:`);
      goalsRecords.forEach(record => {
        console.log(`   - Goles: ${record.goals}, Mes: ${record.month}/${record.year}`);
      });
    } else {
      console.log(`❌ NO tiene registro en goals_history`);
      if (deal.status === 'approved') {
        console.log(`   ⚠️ PROBLEMA: Deal aprobado sin goles en historial`);
      }
    }
  }
  
  // Get user stats
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 getUserStats():`);
  const stats = await storage.getUserStats(user.id);
  console.log(`   Total points: ${stats.availablePoints}`);
  console.log(`   Total deals: ${stats.totalDeals}`);
  console.log(`   Goles del mes (pendingDeals): ${stats.pendingDeals}`);
  console.log(`   Redeemed rewards: ${stats.redeemedRewards}`);
  
  // Get goals history for current month
  const monthlyGoals = await db
    .select()
    .from(goalsHistory)
    .where(
      and(
        eq(goalsHistory.userId, user.id),
        eq(goalsHistory.month, currentMonth),
        eq(goalsHistory.year, currentYear)
      )
    );
  
  console.log(`\n📈 Registros en goals_history para ${currentMonth}/${currentYear}:`);
  if (monthlyGoals.length === 0) {
    console.log(`   ❌ No hay registros para este mes`);
  } else {
    let total = 0;
    monthlyGoals.forEach((record, i) => {
      console.log(`   ${i + 1}. ${record.goals} goles - ${record.description}`);
      total += Number(record.goals);
    });
    console.log(`   TOTAL: ${total} goles`);
  }
  
  console.log(`\n`);
  process.exit(0);
}

checkUserDeals();
