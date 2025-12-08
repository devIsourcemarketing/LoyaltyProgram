/**
 * Script para probar posiciones del leaderboard
 * Crea múltiples usuarios con diferentes cantidades de goles
 * y verifica que las posiciones se calculen correctamente
 */

import { db } from "./server/db";
import { users, deals, goalsHistory } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./server/storage";

async function testLeaderboardPositions() {
  console.log("🏆 PROBANDO POSICIONES DEL LEADERBOARD\n");

  try {
    // Buscar un admin para aprobar deals
    const allUsers = await storage.getAllUsers();
    const adminUser = allUsers.find(u => u.role === "admin" || u.role === "super-admin");
    
    if (!adminUser) {
      console.log("❌ No se encontró usuario admin");
      return;
    }

    console.log(`✅ Admin encontrado: ${adminUser.firstName} ${adminUser.lastName}\n`);

    // Datos de usuarios de prueba con diferentes cantidades de goles
    const testUsers = [
      { 
        firstName: "Test Leader", 
        lastName: "Position 1", 
        username: "test_leader_1",
        email: "testleader1@test.com",
        goals: 50 // Mayor cantidad de goles
      },
      { 
        firstName: "Test Second", 
        lastName: "Position 2", 
        username: "test_second_2",
        email: "testsecond2@test.com",
        goals: 40
      },
      { 
        firstName: "Test Third", 
        lastName: "Position 3", 
        username: "test_third_3",
        email: "testthird3@test.com",
        goals: 30
      },
      { 
        firstName: "Test Fourth", 
        lastName: "Position 4", 
        username: "test_fourth_4",
        email: "testfourth4@test.com",
        goals: 20
      },
      { 
        firstName: "Test Fifth", 
        lastName: "Position 5", 
        username: "test_fifth_5",
        email: "testfifth5@test.com",
        goals: 15
      },
      { 
        firstName: "Test Sixth", 
        lastName: "Position 6", 
        username: "test_sixth_6",
        email: "testsixth6@test.com",
        goals: 10
      },
      { 
        firstName: "Test Seventh", 
        lastName: "Position 7", 
        username: "test_seventh_7",
        email: "testseventh7@test.com",
        goals: 5
      },
      { 
        firstName: "Test Last", 
        lastName: "Position 8", 
        username: "test_last_8",
        email: "testlast8@test.com",
        goals: 2
      },
    ];

    console.log("📝 Creando usuarios de prueba...\n");

    for (const userData of testUsers) {
      // Verificar si el usuario ya existe
      let user = await storage.getUserByEmail(userData.email);

      if (!user) {
        // Crear nuevo usuario
        user = await storage.createUser({
          username: userData.username,
          email: userData.email,
          password: "Test123!", // Password de prueba
          firstName: userData.firstName,
          lastName: userData.lastName,
          region: "BRASIL",
          regionCategory: "ENTERPRISE",
          role: "user",
        });

        console.log(`✅ Usuario creado: ${userData.firstName} ${userData.lastName}`);
      } else {
        console.log(`ℹ️  Usuario ya existe: ${userData.firstName} ${userData.lastName}`);
      }

      // Crear deals para generar goles
      const goalsToCreate = userData.goals;
      const dealsNeeded = Math.ceil(goalsToCreate / 10); // Cada deal de $10,000 = 10 goles
      
      console.log(`   📊 Creando ${dealsNeeded} deals para generar ${goalsToCreate} goles...`);

      for (let i = 0; i < dealsNeeded; i++) {
        const isLastDeal = i === dealsNeeded - 1;
        const goalsForThisDeal = isLastDeal 
          ? goalsToCreate - (i * 10) 
          : 10;
        
        const dealValue = goalsForThisDeal * 1000; // $1000 = 1 gol para new_customer

        // Crear el deal
        const [newDeal] = await db
          .insert(deals)
          .values({
            userId: user.id,
            productName: `Test Product ${i + 1}`,
            dealValue: dealValue.toString(),
            productType: "software",
            dealType: "new_customer",
            quantity: 1,
            closeDate: new Date(),
            status: "approved",
            approvedBy: adminUser.id,
            approvedAt: new Date(),
            pointsEarned: 0,
            goalsEarned: goalsForThisDeal.toString(),
          })
          .returning();

        // Crear entrada en goals_history
        const currentDate = new Date();
        await db.insert(goalsHistory).values({
          userId: user.id,
          dealId: newDeal.id,
          goals: goalsForThisDeal.toString(),
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          description: `Deal ${newDeal.productName} approved`,
        });
      }

      console.log(`   ✅ ${goalsToCreate} goles creados para ${userData.firstName}\n`);
    }

    // Obtener el leaderboard y mostrar posiciones
    console.log("\n🏆 LEADERBOARD ACTUAL:\n");
    console.log("━".repeat(70));
    
    const leaderboard = await storage.getTopUsersByGoals(100); // Obtener todos
    
    leaderboard.forEach((user, index) => {
      const position = index + 1;
      const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : "  ";
      console.log(
        `${medal} Posición ${position.toString().padStart(2)}: ${user.firstName} ${user.lastName.padEnd(15)} - ${user.totalGoals.toFixed(1)} goles`
      );
    });

    console.log("━".repeat(70));

    // Verificar posiciones específicas
    console.log("\n🔍 VERIFICACIÓN DE POSICIONES:\n");

    for (const userData of testUsers) {
      const userInLeaderboard = leaderboard.find(
        u => u.username === userData.username
      );

      if (userInLeaderboard) {
        const position = leaderboard.indexOf(userInLeaderboard) + 1;
        const expectedGoals = userData.goals;
        const actualGoals = userInLeaderboard.totalGoals;
        
        const goalsMatch = Math.abs(actualGoals - expectedGoals) < 0.1;
        
        console.log(
          `${goalsMatch ? "✅" : "❌"} ${userData.firstName.padEnd(15)} - ` +
          `Posición: ${position}, ` +
          `Goles esperados: ${expectedGoals}, ` +
          `Goles reales: ${actualGoals.toFixed(1)}`
        );
      } else {
        console.log(`❌ ${userData.firstName.padEnd(15)} - NO ENCONTRADO en leaderboard`);
      }
    }

    console.log("\n✅ Prueba completada!\n");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// Ejecutar la prueba
testLeaderboardPositions();
