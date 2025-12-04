/**
 * Script de prueba para crear un deal y verificar que los goles se calculan correctamente
 * 
 * Este script:
 * 1. Busca o crea un usuario de prueba
 * 2. Crea un deal con fecha de este mes
 * 3. Lo aprueba automáticamente
 * 4. Verifica que los goles se registraron correctamente en goalsHistory
 * 5. Verifica que getUserStats retorna los goles del mes
 */

import { storage } from "./server/storage";
import { db } from "./server/db";
import { deals, goalsHistory } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function runTest() {
  console.log("🧪 INICIANDO PRUEBA DE CREACIÓN DE DEAL Y GOLES MENSUALES\n");
  console.log("═".repeat(70) + "\n");

  try {
    // 1. Buscar un usuario existente o mostrar error
    console.log("📋 PASO 1: Buscando usuario de prueba...");
    const users = await storage.getAllUsers();
    
    if (users.length === 0) {
      console.log("❌ ERROR: No hay usuarios en la base de datos");
      console.log("   Por favor, crea un usuario primero desde la aplicación");
      process.exit(1);
    }

    // Buscar el usuario específico por email
    const targetEmail = "alejandrosoftware.engineering@gmail.com";
    const testUser = users.find(u => u.email === targetEmail);
    
    if (!testUser) {
      console.log(`❌ ERROR: No se encontró el usuario con email ${targetEmail}`);
      console.log("   Usuarios disponibles:");
      users.slice(0, 5).forEach(u => console.log(`   - ${u.email}`));
      process.exit(1);
    }
    console.log(`✅ Usuario encontrado: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Región: ${testUser.region || 'No asignada'}`);
    console.log(`   Categoría: ${testUser.regionCategory || 'No asignada'}\n`);

    // 2. Verificar configuración regional
    console.log("📋 PASO 2: Verificando configuración regional...");
    if (!testUser.region || !testUser.regionCategory) {
      console.log("⚠️  ADVERTENCIA: Usuario no tiene región/categoría asignada");
      console.log("   Los goles podrían no calcularse correctamente\n");
    } else {
      const regionConfigs = await storage.getAllRegionConfigs();
      const userConfig = regionConfigs.find(config => 
        config.region === testUser.region &&
        config.category === testUser.regionCategory &&
        (!testUser.regionSubcategory || config.subcategory === testUser.regionSubcategory)
      );

      if (userConfig) {
        console.log(`✅ Configuración regional encontrada:`);
        console.log(`   Rate nuevo cliente: $${userConfig.newCustomerGoalRate} = 1 gol`);
        console.log(`   Rate renovación: $${userConfig.renewalGoalRate} = 1 gol\n`);
      } else {
        console.log(`⚠️  ADVERTENCIA: No se encontró configuración regional para este usuario\n`);
      }
    }

    // 3. Verificar goles actuales del usuario ANTES de crear el deal
    console.log("📋 PASO 3: Verificando goles actuales del usuario...");
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const statsBeforeQuery = await storage.getUserStats(testUser.id);
    console.log(`   Goles totales: ${statsBeforeQuery.availablePoints}`);
    console.log(`   Goles del mes actual (${currentMonth}/${currentYear}): ${statsBeforeQuery.pendingDeals}\n`);

    // 4. Crear un deal de prueba
    console.log("📋 PASO 4: Creando deal de prueba...");
    const dealValue = 2000; // $2000
    const dealType = "new_customer"; // Tipo: nuevo cliente
    
    // Fecha de cierre: hoy (mes actual)
    const closeDate = new Date();
    
    const newDeal = await storage.createDeal({
      userId: testUser.id,
      regionId: null, // Se asignará basado en la región del usuario
      productType: "software",
      productName: `TEST DEAL - ${new Date().toISOString()}`,
      dealValue: dealValue.toString(),
      dealType: dealType,
      quantity: 1,
      closeDate: closeDate,
      clientInfo: "Deal creado por script de prueba automática",
      status: "pending", // Lo crearemos como pending primero
    });

    console.log(`✅ Deal creado con ID: ${newDeal.id}`);
    console.log(`   Producto: ${newDeal.productName}`);
    console.log(`   Valor: $${dealValue}`);
    console.log(`   Tipo: ${dealType}`);
    console.log(`   Fecha de cierre: ${closeDate.toLocaleDateString()}`);
    console.log(`   Estado: ${newDeal.status}\n`);

    // 5. Aprobar el deal
    console.log("📋 PASO 5: Aprobando el deal...");
    
    // Buscar un admin para aprobar
    const adminUser = users.find(u => u.role === "admin" || u.role === "super-admin") || users[0];
    
    let approvedDeal;
    try {
      approvedDeal = await storage.approveDeal(newDeal.id, adminUser.id);
    } catch (error: any) {
      // Ignorar error de Socket.IO en scripts de prueba
      if (error.message?.includes('Socket.IO')) {
        console.log("⚠️  Advertencia: Error de Socket.IO ignorado (normal en scripts de prueba)");
        // Obtener el deal actualizado directamente
        approvedDeal = await storage.getDeal(newDeal.id);
      } else {
        throw error;
      }
    }
    
    if (!approvedDeal) {
      console.log("❌ ERROR: No se pudo aprobar el deal");
      process.exit(1);
    }

    console.log(`✅ Deal aprobado exitosamente`);
    console.log(`   Puntos ganados: ${approvedDeal.pointsEarned}`);
    console.log(`   Goles ganados: ${approvedDeal.goalsEarned}\n`);

    // 6. Verificar que se creó el registro en goalsHistory
    console.log("📋 PASO 6: Verificando registro en goals_history...");
    
    const goalsRecords = await db
      .select()
      .from(goalsHistory)
      .where(eq(goalsHistory.dealId, newDeal.id));

    if (goalsRecords.length === 0) {
      console.log("❌ ERROR: No se encontró registro en goals_history para este deal");
      console.log("   Esto indica que la función approveDeal NO está registrando los goles\n");
    } else {
      const goalsRecord = goalsRecords[0];
      console.log(`✅ Registro encontrado en goals_history:`);
      console.log(`   Goles: ${goalsRecord.goals}`);
      console.log(`   Mes: ${goalsRecord.month}`);
      console.log(`   Año: ${goalsRecord.year}`);
      console.log(`   Descripción: ${goalsRecord.description}`);
      console.log(`   Fecha de creación: ${goalsRecord.createdAt}\n`);

      // Verificar que el mes/año coincidan con el closeDate
      const closeDateMonth = closeDate.getMonth() + 1;
      const closeDateYear = closeDate.getFullYear();

      if (goalsRecord.month === closeDateMonth && goalsRecord.year === closeDateYear) {
        console.log(`✅ CORRECTO: El mes/año del registro (${goalsRecord.month}/${goalsRecord.year}) coincide con closeDate\n`);
      } else {
        console.log(`❌ ERROR: El mes/año del registro (${goalsRecord.month}/${goalsRecord.year}) NO coincide con closeDate (${closeDateMonth}/${closeDateYear})`);
        console.log(`   Esto indica que NO se está usando closeDate correctamente\n`);
      }
    }

    // 7. Verificar getUserStats DESPUÉS de aprobar
    console.log("📋 PASO 7: Verificando getUserStats después de aprobar...");
    
    const statsAfter = await storage.getUserStats(testUser.id);
    console.log(`   Goles totales DESPUÉS: ${statsAfter.availablePoints}`);
    console.log(`   Goles del mes DESPUÉS (${currentMonth}/${currentYear}): ${statsAfter.pendingDeals}`);
    
    const golesDelMesEsperados = Number(statsBeforeQuery.pendingDeals) + Number(approvedDeal.goalsEarned || 0);
    
    if (statsAfter.pendingDeals === golesDelMesEsperados) {
      console.log(`✅ CORRECTO: Los goles del mes aumentaron correctamente`);
      console.log(`   Antes: ${statsBeforeQuery.pendingDeals} → Después: ${statsAfter.pendingDeals}\n`);
    } else {
      console.log(`❌ ERROR: Los goles del mes NO coinciden`);
      console.log(`   Esperado: ${golesDelMesEsperados}`);
      console.log(`   Obtenido: ${statsAfter.pendingDeals}\n`);
    }

    // 8. Resumen final
    console.log("═".repeat(70));
    console.log("\n📊 RESUMEN DE LA PRUEBA:\n");
    
    let allTestsPassed = true;

    if (goalsRecords.length > 0) {
      console.log("✅ Se creó el registro en goals_history");
      
      const goalsRecord = goalsRecords[0];
      const closeDateMonth = closeDate.getMonth() + 1;
      const closeDateYear = closeDate.getFullYear();

      if (goalsRecord.month === closeDateMonth && goalsRecord.year === closeDateYear) {
        console.log("✅ El mes/año usa closeDate correctamente");
      } else {
        console.log("❌ El mes/año NO usa closeDate correctamente");
        allTestsPassed = false;
      }

      if (statsAfter.pendingDeals === golesDelMesEsperados) {
        console.log("✅ getUserStats retorna los goles del mes correctamente");
      } else {
        console.log("❌ getUserStats NO retorna los goles del mes correctamente");
        allTestsPassed = false;
      }
    } else {
      console.log("❌ NO se creó el registro en goals_history");
      allTestsPassed = false;
    }

    console.log("\n" + "═".repeat(70));
    
    if (allTestsPassed) {
      console.log("\n🎉 ¡TODAS LAS PRUEBAS PASARON! La funcionalidad está trabajando correctamente.\n");
    } else {
      console.log("\n⚠️  ALGUNAS PRUEBAS FALLARON. Revisa los mensajes de error arriba.\n");
    }

    // 9. Opción de limpiar
    console.log("💡 NOTA: El deal de prueba creado sigue en la base de datos.");
    console.log(`   ID del deal: ${newDeal.id}`);
    console.log(`   Puedes eliminarlo manualmente si lo deseas.\n`);

  } catch (error) {
    console.error("\n❌ ERROR DURANTE LA PRUEBA:", error);
    console.error("\nStack trace:", (error as Error).stack);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar la prueba
runTest();
