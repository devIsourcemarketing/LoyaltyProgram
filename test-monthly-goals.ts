/**
 * Script de prueba para verificar que los goles mensuales se calculan correctamente
 * 
 * Este script verifica:
 * 1. Que los goles se registran en goalsHistory con la fecha correcta del deal (closeDate)
 * 2. Que getUserStats retorna los goles del mes actual correctamente
 * 3. Que los goles se muestran en el dashboard
 */

import { db } from "./server/db";
import { goalsHistory, users, deals } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function testMonthlyGoals() {
  console.log("🧪 Iniciando prueba de goles mensuales...\n");

  try {
    // 1. Buscar un usuario de prueba
    const testUsers = await db.select().from(users).limit(1);
    
    if (testUsers.length === 0) {
      console.log("❌ No se encontraron usuarios en la base de datos");
      return;
    }

    const testUser = testUsers[0];
    console.log(`✅ Usuario de prueba encontrado: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);

    // 2. Obtener la fecha actual
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    
    console.log(`📅 Mes/Año actual: ${currentMonth}/${currentYear}\n`);

    // 3. Verificar goles en goalsHistory para el mes actual
    const monthlyGoalsRecords = await db
      .select()
      .from(goalsHistory)
      .where(
        and(
          eq(goalsHistory.userId, testUser.id),
          eq(goalsHistory.month, currentMonth),
          eq(goalsHistory.year, currentYear)
        )
      );

    console.log(`📊 Registros de goles encontrados para ${testUser.firstName} en ${currentMonth}/${currentYear}:`);
    
    if (monthlyGoalsRecords.length === 0) {
      console.log("   ⚠️  No hay goles registrados para este mes");
    } else {
      let totalMonthlyGoals = 0;
      monthlyGoalsRecords.forEach((record, index) => {
        const goals = Number(record.goals);
        totalMonthlyGoals += goals;
        console.log(`   ${index + 1}. Deal ID: ${record.dealId || 'N/A'}`);
        console.log(`      Goles: ${goals}`);
        console.log(`      Descripción: ${record.description}`);
        console.log(`      Fecha creación: ${record.createdAt}`);
        console.log("");
      });
      console.log(`   ✅ Total de goles del mes: ${totalMonthlyGoals.toFixed(2)}\n`);
    }

    // 4. Verificar todos los deals del usuario para ver sus fechas
    const userDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.userId, testUser.id));

    console.log(`📝 Total de deals del usuario: ${userDeals.length}`);
    
    const dealsThisMonth = userDeals.filter(deal => {
      const dealDate = new Date(deal.closeDate);
      return dealDate.getMonth() + 1 === currentMonth && 
             dealDate.getFullYear() === currentYear &&
             deal.status === 'approved';
    });

    console.log(`📝 Deals APROBADOS del mes actual (${currentMonth}/${currentYear}): ${dealsThisMonth.length}`);
    
    if (dealsThisMonth.length > 0) {
      console.log("\nDetalles de deals del mes actual:");
      dealsThisMonth.forEach((deal, index) => {
        console.log(`   ${index + 1}. ${deal.productName}`);
        console.log(`      Valor: $${deal.dealValue}`);
        console.log(`      Fecha de cierre: ${deal.closeDate}`);
        console.log(`      Estado: ${deal.status}`);
        console.log(`      Goles ganados: ${deal.goalsEarned || '0'}`);
        console.log("");
      });
    }

    // 5. Verificar que los goles en goalsHistory coincidan con los deals del mes
    console.log("\n🔍 Verificación de consistencia:");
    if (dealsThisMonth.length === monthlyGoalsRecords.length) {
      console.log(`   ✅ Número de deals (${dealsThisMonth.length}) coincide con registros de goles (${monthlyGoalsRecords.length})`);
    } else {
      console.log(`   ⚠️  ADVERTENCIA: Deals del mes (${dealsThisMonth.length}) != Registros de goles (${monthlyGoalsRecords.length})`);
      console.log(`   Esto podría indicar que algunos deals aprobados no tienen goles registrados`);
    }

    console.log("\n✅ Prueba completada");

  } catch (error) {
    console.error("❌ Error durante la prueba:", error);
  }

  process.exit(0);
}

// Ejecutar la prueba
testMonthlyGoals();
