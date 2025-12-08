import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function checkUserGoals() {
  try {
    console.log("🔍 Verificando cálculo de goles para el usuario...\n");

    // Buscar el usuario mencionado en la imagen (Vanessa Quintero / @user_@_nola20)
    const users = await sql`
      SELECT id, username, email, first_name, last_name, region 
      FROM users 
      WHERE username LIKE '%vanessa%' OR first_name LIKE '%Vanessa%' OR email LIKE '%vanessa%'
      LIMIT 5
    `;

    console.log("👤 Usuarios encontrados:");
    users.forEach((u: any) => {
      console.log(`   - ${u.first_name} ${u.last_name} (@${u.username}) - ${u.email} [${u.region}]`);
    });

    if (users.length === 0) {
      console.log("\n❌ No se encontró ningún usuario con ese nombre");
      return;
    }

    const user = users[0];
    console.log(`\n📊 Analizando goles para: ${user.first_name} ${user.last_name}\n`);

    // Obtener todos los registros de goals_history
    const goalsHistory = await sql`
      SELECT 
        gh.id,
        gh.goals,
        gh.month,
        gh.year,
        gh.description,
        gh.created_at,
        d.id as deal_id,
        d.product_name,
        d.deal_value,
        d.deal_type,
        d.close_date
      FROM goals_history gh
      LEFT JOIN deals d ON gh.deal_id = d.id
      WHERE gh.user_id = ${user.id}
      ORDER BY gh.created_at DESC
    `;

    console.log(`📈 Registros en goals_history (${goalsHistory.length} total):\n`);
    
    let totalGoals = 0;
    goalsHistory.forEach((gh: any, index: number) => {
      const goals = parseFloat(gh.goals);
      totalGoals += goals;
      console.log(`${index + 1}. ${gh.description}`);
      console.log(`   Goles: ${goals.toFixed(2)} | Mes/Año: ${gh.month}/${gh.year}`);
      console.log(`   Deal: ${gh.product_name || 'N/A'} (${gh.deal_value || 'N/A'})`);
      console.log(`   Fecha: ${new Date(gh.created_at).toLocaleDateString()}\n`);
    });

    console.log(`\n🎯 SUMA TOTAL DE GOLES: ${totalGoals.toFixed(2)}`);

    // Obtener el total desde la query de la aplicación
    const statsResult = await sql`
      SELECT SUM(goals) as total 
      FROM goals_history 
      WHERE user_id = ${user.id}
    `;

    const dbTotal = parseFloat(statsResult[0]?.total || 0);
    console.log(`📊 Total según DB query: ${dbTotal.toFixed(2)}`);

    // Verificar mes actual
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const monthlyResult = await sql`
      SELECT SUM(goals) as total 
      FROM goals_history 
      WHERE user_id = ${user.id}
        AND month = ${currentMonth}
        AND year = ${currentYear}
    `;

    const monthlyTotal = parseFloat(monthlyResult[0]?.total || 0);
    console.log(`📅 Total del mes actual (${currentMonth}/${currentYear}): ${monthlyTotal.toFixed(2)}`);

    // Mostrar todos los deals del usuario
    console.log(`\n\n💼 Deals del usuario:\n`);
    const deals = await sql`
      SELECT 
        id,
        product_name,
        deal_value,
        deal_type,
        points_earned,
        status,
        close_date,
        created_at
      FROM deals
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    deals.forEach((deal: any, index: number) => {
      console.log(`${index + 1}. ${deal.product_name} - ${deal.deal_type}`);
      console.log(`   Valor: $${deal.deal_value} | Puntos: ${deal.points_earned || 0} | Estado: ${deal.status}`);
      console.log(`   Cierre: ${new Date(deal.close_date).toLocaleDateString()}\n`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

checkUserGoals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
