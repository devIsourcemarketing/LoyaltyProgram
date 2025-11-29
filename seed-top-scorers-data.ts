import { db } from "./server/db";
import { users, deals, pointsHistory } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedTopScorersData() {
  console.log("🎯 Poblando datos de prueba para Top Scorers...\n");

  // Primero, obtener un admin existente para usarlo como approvedBy
  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'super-admin'))
    .limit(1);

  if (!adminUser) {
    console.error("❌ No se encontró un super-admin en la base de datos.");
    console.log("💡 Primero debes crear un super-admin para poder aprobar los deals.");
    return;
  }

  console.log(`✅ Usando admin: ${adminUser.email} para aprobar deals\n`);

  // Regiones válidas del sistema
  const testUsers = [
    {
      username: "campeón_nola",
      email: "campeon@nola.test",
      firstName: "Carlos",
      lastName: "Rodríguez",
      region: "NOLA",
      regionCategory: "ENTERPRISE",
      company: "TechCorp USA",
      role: "user" as const,
      isActive: true,
      password: await bcrypt.hash("password123", 10),
      deals: [
        { productName: "Kaspersky Endpoint Security", dealValue: 15000, productType: "software", dealType: "new_customer" },
        { productName: "Kaspersky Total Security", dealValue: 8000, productType: "software", dealType: "renewal" },
        { productName: "Hardware Bundle", dealValue: 12000, productType: "hardware", dealType: "new_customer" },
      ]
    },
    {
      username: "estrella_sola",
      email: "estrella@sola.test",
      firstName: "María",
      lastName: "González",
      region: "SOLA",
      regionCategory: "ENTERPRISE",
      company: "Solutions Brasil",
      role: "user" as const,
      isActive: true,
      password: await bcrypt.hash("password123", 10),
      deals: [
        { productName: "Kaspersky Security Cloud", dealValue: 20000, productType: "software", dealType: "new_customer" },
        { productName: "Network Protection", dealValue: 6000, productType: "equipment", dealType: "renewal" },
      ]
    },
    {
      username: "pro_nola2",
      email: "pro@nola2.test",
      firstName: "Roberto",
      lastName: "Sánchez",
      region: "NOLA",
      regionCategory: "SMB",
      company: "Small Business Tech",
      role: "user" as const,
      isActive: true,
      password: await bcrypt.hash("password123", 10),
      deals: [
        { productName: "Basic Protection", dealValue: 5000, productType: "software", dealType: "new_customer" },
        { productName: "Antivirus Renewal", dealValue: 3000, productType: "software", dealType: "renewal" },
      ]
    },
    {
      username: "vendedor_sola2",
      email: "vendedor@sola2.test",
      firstName: "Laura",
      lastName: "Silva",
      region: "SOLA",
      regionCategory: "ENTERPRISE",
      company: "Enterprise Solutions BR",
      role: "user" as const,
      isActive: true,
      password: await bcrypt.hash("password123", 10),
      deals: [
        { productName: "Enterprise Suite", dealValue: 18000, productType: "software", dealType: "new_customer" },
      ]
    },
    {
      username: "vendedor_nola3",
      email: "vendedor3@nola.test",
      firstName: "Ana",
      lastName: "Martínez",
      region: "NOLA",
      regionCategory: "ENTERPRISE",
      company: "Enterprise NOLA Inc",
      role: "user" as const,
      isActive: true,
      password: await bcrypt.hash("password123", 10),
      deals: [
        { productName: "Premium Security Suite", dealValue: 25000, productType: "software", dealType: "new_customer" },
        { productName: "Firewall Package", dealValue: 7000, productType: "equipment", dealType: "renewal" },
      ]
    },
    {
      username: "top_sola3",
      email: "top@sola3.test",
      firstName: "Diego",
      lastName: "Santos",
      region: "SOLA",
      regionCategory: "SMB",
      company: "SMB Brasil Tech",
      role: "user" as const,
      isActive: true,
      password: await bcrypt.hash("password123", 10),
      deals: [
        { productName: "SMB Security Pack", dealValue: 8500, productType: "software", dealType: "new_customer" },
        { productName: "Backup Solution", dealValue: 4500, productType: "equipment", dealType: "new_customer" },
      ]
    },
  ];

  let totalUsersCreated = 0;
  let totalDealsCreated = 0;
  let totalPointsAssigned = 0;

  for (const userData of testUsers) {
    try {
      // Verificar si el usuario ya existe
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      let user;
      if (existingUser) {
        console.log(`⏭️  Usuario ya existe: ${userData.email}`);
        user = existingUser;
      } else {
        // Crear usuario
        const { deals: userDeals, ...userInfo } = userData;
        const [newUser] = await db
          .insert(users)
          .values(userInfo)
          .returning();
        
        user = newUser;
        totalUsersCreated++;
        console.log(`✅ Usuario creado: ${userData.firstName} ${userData.lastName} (${userData.region})`);
      }

      // Crear deals y puntos
      for (const dealData of userData.deals) {
        // Crear el deal como aprobado directamente
        const [deal] = await db
          .insert(deals)
          .values({
            userId: user.id,
            productName: dealData.productName,
            dealValue: dealData.dealValue.toString(),
            productType: dealData.productType,
            dealType: dealData.dealType,
            quantity: "1",
            closeDate: new Date(),
            status: "approved",
            approvedBy: adminUser.id, // Usar ID del admin real
            approvedAt: new Date(),
            pointsEarned: Math.floor(dealData.dealValue / 100), // 1 punto por cada $100
            goalsEarned: "0",
          })
          .returning();

        totalDealsCreated++;

        // Agregar puntos al historial
        const pointsEarned = Math.floor(dealData.dealValue / 100);
        await db.insert(pointsHistory).values({
          userId: user.id,
          dealId: deal.id,
          points: pointsEarned,
          description: `Puntos por ${dealData.productName}`,
        });

        totalPointsAssigned += pointsEarned;
        console.log(`  💰 Deal: ${dealData.productName} - $${dealData.dealValue} = ${pointsEarned} puntos`);
      }

      console.log("");
    } catch (error) {
      console.error(`❌ Error procesando usuario ${userData.email}:`, error);
    }
  }

  console.log("\n📊 RESUMEN:");
  console.log(`✅ Usuarios creados: ${totalUsersCreated}`);
  console.log(`✅ Deals creados: ${totalDealsCreated}`);
  console.log(`✅ Puntos asignados: ${totalPointsAssigned}`);
  console.log("\n🎯 Top Scorers esperados (aproximado):");
  console.log("1. Ana Martínez (NOLA) - ~320 puntos");
  console.log("2. María González (SOLA) - ~260 puntos");
  console.log("3. Laura Silva (SOLA) - ~180 puntos");
  console.log("4. Carlos Rodríguez (NOLA) - ~350 puntos");
  console.log("5. Diego Santos (SOLA) - ~130 puntos");
  console.log("6. Roberto Sánchez (NOLA) - ~80 puntos");
  console.log("\n✅ Datos poblados exitosamente!");
  console.log("🔥 Ahora puedes iniciar sesión con cualquiera de estos usuarios:");
  console.log("   Email: campeon@nola.test | Password: password123");
  console.log("   O usar un admin existente para ver el Top Scorers en /admin");
}

seedTopScorersData()
  .then(() => {
    console.log("\n✅ Proceso completado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  });
