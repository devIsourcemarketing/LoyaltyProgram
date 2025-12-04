/**
 * Script para demostrar que los goles mensuales y totales son diferentes
 * 
 * Este script:
 * 1. Crea un deal con fecha de NOVIEMBRE 2025 (mes pasado)
 * 2. Lo aprueba
 * 3. Verifica que los goles totales aumentan PERO los del mes actual NO
 */

import { storage } from "./server/storage";
import { db } from "./server/db";
import { goalsHistory } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function testDifferentMonths() {
  console.log("🧪 PRUEBA: GOLES TOTALES vs GOLES DEL MES\n");
  console.log("═".repeat(70) + "\n");

  try {
    const targetEmail = "alejandrosoftware.engineering@gmail.com";
    
    // Get user
    const user = await storage.getUserByEmail(targetEmail);
    if (!user) {
      console.log(`❌ Usuario ${targetEmail} no encontrado`);
      process.exit(1);
    }

    console.log(`👤 Usuario: ${user.firstName} ${user.lastName}\n`);

    // Get current stats BEFORE
    const statsBefore = await storage.getUserStats(user.id);
    console.log("📊 ESTADÍSTICAS ANTES:");
    console.log(`   Goles totales: ${statsBefore.availablePoints}`);
    console.log(`   Goles del mes (Diciembre 2025): ${statsBefore.pendingDeals}\n`);

    // Create a deal with NOVEMBER date (last month)
    console.log("📋 Creando deal con fecha de NOVIEMBRE 2025 (mes pasado)...\n");
    
    const dealValue = 3000; // $3000 = 3 goles para nuevo cliente
    
    // Fecha de cierre: Noviembre 15, 2025
    const closeDate = new Date(2025, 10, 15); // Month is 0-indexed, so 10 = November
    
    const newDeal = await storage.createDeal({
      userId: user.id,
      regionId: null,
      productType: "software",
      productName: `TEST DEAL NOVIEMBRE - ${new Date().toISOString()}`,
      dealValue: dealValue.toString(),
      dealType: "new_customer",
      quantity: 1,
      closeDate: closeDate,
      clientInfo: "Deal de prueba para NOVIEMBRE (mes pasado)",
      status: "pending",
    });

    console.log(`✅ Deal creado:`);
    console.log(`   ID: ${newDeal.id}`);
    console.log(`   Valor: $${dealValue}`);
    console.log(`   Fecha de cierre: ${closeDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`   Estado: ${newDeal.status}\n`);

    // Approve the deal
    console.log("📋 Aprobando el deal...\n");
    
    const users = await storage.getAllUsers();
    const adminUser = users.find(u => u.role === "admin" || u.role === "super-admin") || users[0];
    
    let approvedDeal;
    try {
      approvedDeal = await storage.approveDeal(newDeal.id, adminUser.id);
    } catch (error: any) {
      if (error.message?.includes('Socket.IO')) {
        console.log("⚠️  Advertencia: Error de Socket.IO ignorado\n");
        approvedDeal = await storage.getDeal(newDeal.id);
      } else {
        throw error;
      }
    }

    console.log(`✅ Deal aprobado:`);
    console.log(`   Goles ganados: ${approvedDeal?.goalsEarned}\n`);

    // Verify goals_history
    const goalsRecords = await db
      .select()
      .from(goalsHistory)
      .where(eq(goalsHistory.dealId, newDeal.id));

    if (goalsRecords.length > 0) {
      const record = goalsRecords[0];
      console.log(`✅ Registro en goals_history:`);
      console.log(`   Goles: ${record.goals}`);
      console.log(`   Mes: ${record.month}/${record.year}`);
      
      if (record.month === 11 && record.year === 2025) {
        console.log(`   ✅ CORRECTO: Registrado en NOVIEMBRE 2025\n`);
      } else {
        console.log(`   ❌ ERROR: Esperaba mes 11/2025, obtuvo ${record.month}/${record.year}\n`);
      }
    }

    // Get stats AFTER
    const statsAfter = await storage.getUserStats(user.id);
    
    console.log("═".repeat(70));
    console.log("\n📊 COMPARACIÓN DE ESTADÍSTICAS:\n");
    
    console.log("┌─────────────────────────────────┬─────────┬──────────┬─────────┐");
    console.log("│ Campo                           │ Antes   │ Después  │ Cambio  │");
    console.log("├─────────────────────────────────┼─────────┼──────────┼─────────┤");
    console.log(`│ Goles TOTALES                   │ ${String(statsBefore.availablePoints).padEnd(7)} │ ${String(statsAfter.availablePoints).padEnd(8)} │ +${statsAfter.availablePoints - statsBefore.availablePoints}      │`);
    console.log(`│ Goles del MES (Diciembre 2025)  │ ${String(statsBefore.pendingDeals).padEnd(7)} │ ${String(statsAfter.pendingDeals).padEnd(8)} │ ${statsAfter.pendingDeals - statsBefore.pendingDeals === 0 ? '0 (sin cambio)' : '+' + (statsAfter.pendingDeals - statsBefore.pendingDeals)} │`);
    console.log("└─────────────────────────────────┴─────────┴──────────┴─────────┘\n");

    console.log("═".repeat(70));
    console.log("\n🎯 CONCLUSIÓN:\n");

    const totalIncreased = statsAfter.availablePoints > statsBefore.availablePoints;
    const monthlyUnchanged = statsAfter.pendingDeals === statsBefore.pendingDeals;

    if (totalIncreased && monthlyUnchanged) {
      console.log("✅ ¡CORRECTO! Los campos son DIFERENTES:");
      console.log(`   ✅ Los goles TOTALES aumentaron (de ${statsBefore.availablePoints} a ${statsAfter.availablePoints})`);
      console.log(`   ✅ Los goles del MES NO cambiaron (siguen en ${statsAfter.pendingDeals})`);
      console.log(`   ✅ Esto demuestra que el deal de NOVIEMBRE no afecta los goles de DICIEMBRE\n`);
    } else {
      console.log("❌ Algo salió mal:");
      if (!totalIncreased) console.log(`   ❌ Los goles totales NO aumentaron`);
      if (!monthlyUnchanged) console.log(`   ❌ Los goles del mes cambiaron cuando NO deberían`);
      console.log();
    }

    console.log("💡 NOTA: El deal de prueba de NOVIEMBRE queda en la base de datos.");
    console.log(`   ID del deal: ${newDeal.id}\n`);

  } catch (error) {
    console.error("\n❌ ERROR DURANTE LA PRUEBA:", error);
    console.error("\nStack trace:", (error as Error).stack);
    process.exit(1);
  }

  process.exit(0);
}

testDifferentMonths();
