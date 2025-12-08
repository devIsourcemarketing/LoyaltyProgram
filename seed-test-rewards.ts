import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function seedTestRewards() {
  try {
    console.log("🎁 Iniciando seed de premios de prueba...\n");

    // Obtener un usuario de prueba (primer usuario activo)
    const users = await sql`
      SELECT id, username, region FROM users 
      WHERE role = 'user' AND is_active = true 
      LIMIT 1
    `;

    if (users.length === 0) {
      console.log("❌ No se encontró ningún usuario activo para crear redenciones de prueba");
      return;
    }

    const testUser = users[0];
    console.log(`👤 Usuario de prueba: ${testUser.username} (${testUser.region})`);

    // Crear premios de prueba
    console.log("\n📦 Creando premios de prueba...\n");

    const rewards = [
      {
        name: "Premio Test - Disponible",
        description: "Premio disponible para canjear (sin redención)",
        pointsCost: 1000,
        region: testUser.region,
        imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400",
      },
      {
        name: "Premio Test - Pendiente",
        description: "Premio con redención pendiente de aprobación",
        pointsCost: 2000,
        region: testUser.region,
        imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400",
      },
      {
        name: "Premio Test - Aprobado",
        description: "Premio con redención aprobada, pendiente de entrega",
        pointsCost: 3000,
        region: testUser.region,
        imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
      },
      {
        name: "Premio Test - Entregado",
        description: "Premio ya entregado al usuario",
        pointsCost: 4000,
        region: testUser.region,
        imageUrl: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400",
      },
      {
        name: "Premio Test - Sin Puntos",
        description: "Premio que requiere muchos puntos (para probar insuficientes)",
        pointsCost: 50000,
        region: testUser.region,
        imageUrl: "https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=400",
      },
    ];

    const createdRewards = [];

    for (const reward of rewards) {
      const result = await sql`
        INSERT INTO rewards (name, description, points_cost, region, is_active, stock_quantity, image_url, estimated_delivery_days)
        VALUES (
          ${reward.name},
          ${reward.description},
          ${reward.pointsCost},
          ${reward.region},
          true,
          100,
          ${reward.imageUrl},
          15
        )
        RETURNING id, name
      `;
      
      createdRewards.push({
        id: result[0].id,
        name: result[0].name,
      });
      
      console.log(`   ✅ ${reward.name} (${reward.pointsCost} puntos)`);
    }

    // Crear redenciones de prueba
    console.log("\n🎯 Creando redenciones de prueba...\n");

    // 1. Premio Pendiente
    await sql`
      INSERT INTO user_rewards (user_id, reward_id, status, shipment_status, redeemed_at)
      VALUES (
        ${testUser.id},
        ${createdRewards[1].id},
        'pending',
        'pending',
        NOW()
      )
    `;
    console.log(`   ⏳ Redención PENDIENTE creada para: ${createdRewards[1].name}`);

    // 2. Premio Aprobado
    const adminUsers = await sql`
      SELECT id FROM users 
      WHERE role IN ('admin', 'super-admin') 
      LIMIT 1
    `;
    
    const adminId = adminUsers.length > 0 ? adminUsers[0].id : testUser.id;

    await sql`
      INSERT INTO user_rewards (user_id, reward_id, status, shipment_status, redeemed_at, approved_by, approved_at)
      VALUES (
        ${testUser.id},
        ${createdRewards[2].id},
        'approved',
        'pending',
        NOW() - INTERVAL '2 days',
        ${adminId},
        NOW() - INTERVAL '1 day'
      )
    `;
    console.log(`   ✅ Redención APROBADA creada para: ${createdRewards[2].name}`);

    // 3. Premio Entregado
    await sql`
      INSERT INTO user_rewards (user_id, reward_id, status, shipment_status, redeemed_at, approved_by, approved_at, shipped_at, delivered_at, delivery_address)
      VALUES (
        ${testUser.id},
        ${createdRewards[3].id},
        'delivered',
        'delivered',
        NOW() - INTERVAL '10 days',
        ${adminId},
        NOW() - INTERVAL '9 days',
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '3 days',
        'Dirección de prueba, Ciudad, País'
      )
    `;
    console.log(`   📦 Redención ENTREGADA creada para: ${createdRewards[3].name}`);

    console.log("\n✨ Seed de premios de prueba completado exitosamente!");
    console.log("\n📋 Resumen:");
    console.log(`   - ${createdRewards.length} premios creados`);
    console.log(`   - 3 redenciones de prueba creadas (pendiente, aprobada, entregada)`);
    console.log(`   - Usuario de prueba: ${testUser.username}`);
    console.log("\n🎯 Ahora puedes verificar la página de premios para ver:");
    console.log("   1. Premio disponible (habilitado, se puede canjear)");
    console.log("   2. Premio pendiente (deshabilitado, amarillo)");
    console.log("   3. Premio aprobado (deshabilitado, verde)");
    console.log("   4. Premio entregado (deshabilitado, azul)");
    console.log("   5. Premio sin puntos suficientes (deshabilitado por puntos)");

  } catch (error) {
    console.error("❌ Error al crear premios de prueba:", error);
    throw error;
  }
}

seedTestRewards()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
