// ───────────────────────────────────────────────
// Database schema and types
// ───────────────────────────────────────────────
import {
  campaigns,
  deals,
  notifications,
  pointsConfig,
  pointsHistory,
  rewards,
  supportTickets,
  userRewards,
  users,
  regionConfigs,
  monthlyRegionPrizes,
  rewardRegionAssignments,
  goalsHistory,
  grandPrizeCriteria,
  grandPrizeWinners,
  regionCategories,
  prizeTemplates,
  productTypesTable,
  categoriesMaster,
  auditLog,
  type Campaign,
  type Deal,
  type DealWithUser,
  type InsertCampaign,
  type InsertDeal,
  type InsertNotification,
  type InsertPointsHistory,
  type InsertReward,
  type InsertSupportTicket,
  type InsertUser,
  type InsertUserReward,
  type Notification,
  type PointsConfig,
  type PointsHistory,
  type Reward,
  type SupportTicket,
  type SupportTicketWithUser,
  type UpdateDeal,
  type UpdatePointsConfig,
  type UpdateSupportTicket,
  type User,
  type UserReward,
  type RegionConfig,
  type InsertRegionConfig,
  type MonthlyRegionPrize,
  type InsertMonthlyRegionPrize,
  type RewardRegionAssignment,
  type GoalsHistory,
  type AuditLog,
  type InsertAuditLog,
  type GrandPrizeCriteria,
  type InsertGrandPrizeCriteria,
  type UpdateGrandPrizeCriteria,
  type Region,
} from "@shared/schema";

// ───────────────────────────────────────────────
// Database connection and ORM helpers
// ───────────────────────────────────────────────
import { db } from "./db";
import { and, asc, desc, eq, ne, count, sum, gte, gt, lte, isNotNull, isNull, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

// ───────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────
import { randomUUID } from "crypto";
import { NotificationHelpers } from "./notifications";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailAndRegion(email: string, region: string): Promise<User | undefined>;
  getUserByInviteToken(inviteToken: string): Promise<User | undefined>;
  getUserByLoginToken(loginToken: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUserStats(userId: string): Promise<{
    totalPoints: number;
    availablePoints: number;
    totalDeals: number;
    pendingDeals: number;
    redeemedRewards: number;
  }>;

  // Deal methods
  createDeal(deal: InsertDeal): Promise<Deal>;
  getDeal(id: string): Promise<Deal | undefined>;
  getUserDeals(userId: string): Promise<Deal[]>;
  getPendingDeals(regionId?: string): Promise<DealWithUser[]>;
  getAllDeals(page?: number, limit?: number, regionId?: string): Promise<{ deals: DealWithUser[]; total: number }>;
  approveDeal(id: string, approvedBy: string): Promise<Deal | undefined>;
  rejectDeal(id: string): Promise<Deal | undefined>;
  updateDeal(id: string, updates: UpdateDeal): Promise<Deal | undefined>;
  getRecentDeals(userId: string, limit?: number): Promise<Deal[]>;

  // Reward methods
  getRewards(regionName?: string): Promise<Reward[]>;
  getReward(id: string): Promise<Reward | undefined>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(
    id: string,
    updates: Partial<Reward>,
  ): Promise<Reward | undefined>;
  deleteReward(id: string): Promise<Reward | undefined>;
  redeemReward(userId: string, rewardId: string): Promise<UserReward>;
  getUserRewards(userId: string): Promise<UserReward[]>;
  updateRewardShipmentStatus(
    rewardRedemptionId: string,
    shipmentStatus: "pending" | "shipped" | "delivered",
    adminId: string,
  ): Promise<UserReward | undefined>;
  approveRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
  ): Promise<UserReward | undefined>;
  rejectRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
    reason?: string,
  ): Promise<UserReward | undefined>;
  getPendingRewardRedemptions(regionId?: string): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
      }
    >
  >;
  getAllRewardRedemptions(): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
        pointsCost?: number;
      }
    >
  >;
  getUserRewardsWithDetails(
    userId: string,
  ): Promise<Array<UserReward & { rewardName?: string; pointsCost?: number }>>;

  // Points methods
  addPointsHistory(entry: InsertPointsHistory): Promise<PointsHistory>;
  getUserPointsHistory(userId: string): Promise<PointsHistory[]>;
  getUserTotalPoints(userId: string): Promise<number>;
  getUserAvailablePoints(userId: string): Promise<number>;
  getTopUsersByPoints(limit?: number): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      totalPoints: number;
    }>
  >;

  // Campaign methods
  getCampaigns(region?: Region): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;

  // Admin methods
  getAllUsers(regionId?: string): Promise<User[]>;
  getAllDeals(page?: number, limit?: number, regionId?: string): Promise<{ deals: DealWithUser[]; total: number }>;
  getPendingUsers(regionId?: string): Promise<User[]>;
  approveUser(userId: string, approvedBy: string): Promise<User | undefined>;
  rejectUser(userId: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<User | undefined>;
  getReportsData(filters: {
    country?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    userCount: number;
    dealCount: number;
    totalRevenue: number;
    redeemedRewards: number;
  }>;

  getRewardRedemptionsReport(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    Array<{
      userName: string;
      userFirstName: string;
      userLastName: string;
      userEmail: string;
      rewardName: string;
      pointsCost: number;
      status: string;
      redeemedAt: Date;
      approvedAt: Date | null;
    }>
  >;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Support Ticket methods
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  getUserSupportTickets(userId: string): Promise<SupportTicket[]>;
  getAllSupportTickets(regionId?: string): Promise<SupportTicketWithUser[]>;
  updateSupportTicket(
    id: string,
    updates: UpdateSupportTicket,
  ): Promise<SupportTicket | undefined>;

  // Points Config methods
  getPointsConfig(): Promise<PointsConfig | undefined>;
  getPointsConfigByRegion(region: string): Promise<PointsConfig | undefined>;
  updatePointsConfig(
    updates: UpdatePointsConfig,
    updatedBy: string,
  ): Promise<PointsConfig | undefined>;
  updatePointsConfigByRegion(
    updates: UpdatePointsConfig,
    updatedBy: string,
  ): Promise<PointsConfig | undefined>;

  // Regions methods
  getAllRegionConfigs(): Promise<RegionConfig[]>;
  getRegionConfig(id: string): Promise<RegionConfig | undefined>;
  createRegionConfig(config: InsertRegionConfig): Promise<RegionConfig>;
  updateRegionConfig(id: string, updates: Partial<RegionConfig>): Promise<RegionConfig | undefined>;
  deleteRegionConfig(id: string): Promise<RegionConfig | undefined>;
  getMonthlyRegionPrizes(
    regionConfigId: string,
    month: number,
    year: number,
  ): Promise<MonthlyRegionPrize[]>;
  seedRegions(): Promise<void>;

  // Campaign methods
  getCampaigns(region?: Region): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<Campaign | undefined>;
  
  // Region Config methods (extended)
  getRegionConfigs(): Promise<RegionConfig[]>;

  // Grand Prize methods
  getActiveGrandPrizeCriteria(region?: string): Promise<GrandPrizeCriteria | undefined>;
  getAllGrandPrizeCriteria(region?: string): Promise<GrandPrizeCriteria[]>;
  createGrandPrizeCriteria(criteria: InsertGrandPrizeCriteria): Promise<GrandPrizeCriteria>;
  updateGrandPrizeCriteria(id: string, updates: UpdateGrandPrizeCriteria): Promise<GrandPrizeCriteria | undefined>;
  deleteGrandPrizeCriteria(id: string): Promise<void>;
  getGrandPrizeRanking(criteriaId: string): Promise<any[]>;

  // Monthly Prizes methods
  getMonthlyPrizes(month?: number, year?: number, region?: string): Promise<MonthlyRegionPrize[]>;
  createMonthlyPrize(prize: InsertMonthlyRegionPrize): Promise<MonthlyRegionPrize>;
  updateMonthlyPrize(id: string, updates: Partial<MonthlyRegionPrize>): Promise<MonthlyRegionPrize | undefined>;
  deleteMonthlyPrize(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByEmailAndRegion(email: string, region: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.region, region as any)
      ));
    return user || undefined;
  }

  async getUserByInviteToken(inviteToken: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.inviteToken, inviteToken));
    return user || undefined;
  }

  async getUserByLoginToken(loginToken: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.loginToken, loginToken));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUserStats(userId: string): Promise<{
    totalPoints: number;
    availablePoints: number;
    totalDeals: number;
    pendingDeals: number;
    redeemedRewards: number;
  }> {
    const [totalPointsResult] = await db
      .select({ total: sum(pointsHistory.points) })
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId));

    const [totalDealsResult] = await db
      .select({ count: count() })
      .from(deals)
      .where(eq(deals.userId, userId));

    const [pendingDealsResult] = await db
      .select({ count: count() })
      .from(deals)
      .where(and(eq(deals.userId, userId), eq(deals.status, "pending")));

    const [redeemedRewardsResult] = await db
      .select({ count: count() })
      .from(pointsHistory)
      .where(
        and(
          eq(pointsHistory.userId, userId),
          isNotNull(pointsHistory.rewardId),
        ),
      );

    const totalPoints = Number(totalPointsResult?.total || 0);
    const availablePoints = await this.getUserAvailablePoints(userId);

    return {
      totalPoints,
      availablePoints,
      totalDeals: totalDealsResult?.count || 0,
      pendingDeals: pendingDealsResult?.count || 0,
      redeemedRewards: redeemedRewardsResult?.count || 0,
    };
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [createdDeal] = await db.insert(deals).values(deal).returning();
    return createdDeal;
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async getUserDeals(userId: string): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(desc(deals.createdAt));
  }

  async getPendingDeals(regionName?: string): Promise<DealWithUser[]> {
    // Build filter conditions - always filter by pending status
    const baseConditions = [eq(deals.status, "pending")];

    const result = await db
      .select({
        id: deals.id,
        userId: deals.userId,
        regionId: deals.regionId,
        productType: deals.productType,
        productName: deals.productName,
        dealValue: deals.dealValue,
        dealType: deals.dealType,
        quantity: deals.quantity,
        closeDate: deals.closeDate,
        clientInfo: deals.clientInfo,
        licenseAgreementNumber: deals.licenseAgreementNumber,
        status: deals.status,
        pointsEarned: deals.pointsEarned,
        goalsEarned: deals.goalsEarned,
        approvedBy: deals.approvedBy,
        approvedAt: deals.approvedAt,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userName: users.username,
      })
      .from(deals)
      .leftJoin(users, eq(deals.userId, users.id))
      .where(
        regionName 
          ? and(...baseConditions, eq(users.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"))
          : and(...baseConditions)
      )
      .orderBy(desc(deals.createdAt));

    return result as DealWithUser[];
  }

  // Calculate points based on product type and deal value using dynamic configuration
  private async calculatePointsForDeal(
    dealType: string,
    dealValue: number,
  ): Promise<number> {
    const value = Number(dealValue);
    if (isNaN(value) || value <= 0) return 0;

    const config = await this.getPointsConfig();

    // Use new deal-type based rates
    const newCustomerRate = (config as any)?.newCustomerRate || config?.softwareRate || 1000;
    const renewalRate = (config as any)?.renewalRate || config?.hardwareRate || 2000;

    switch (dealType) {
      case "new_customer":
        return Math.floor(value / newCustomerRate);
      case "renewal":
        return Math.floor(value / renewalRate);
      default:
        // Fallback for backward compatibility
        return Math.floor(value / newCustomerRate);
    }
  }

  async approveDeal(id: string, approvedBy: string): Promise<Deal | undefined> {
    const deal = await this.getDeal(id);
    if (!deal) return undefined;

    // Calculate points based on dynamic configuration
    const pointsEarned = await this.calculatePointsForDeal(
      deal.dealType,
      Number(deal.dealValue),
    );

    // Get user to determine their region configuration
    const user = await this.getUser(deal.userId);
    let goalsEarned = 0;
    let regionConfigId: string | null = null;

    if (user && user.region && user.regionCategory) {
      // Find the region configuration for this user
      const regionConfig = await db
        .select()
        .from(regionConfigs)
        .where(
          and(
            eq(regionConfigs.region, user.region),
            eq(regionConfigs.category, user.regionCategory),
            user.regionSubcategory 
              ? eq(regionConfigs.subcategory, user.regionSubcategory)
              : isNull(regionConfigs.subcategory)
          )
        )
        .limit(1);

      if (regionConfig.length > 0) {
        const config = regionConfig[0];
        regionConfigId = config.id;
        
        // Calculate goals based on deal type and region configuration
        const dealValue = Number(deal.dealValue);
        const goalRate = deal.dealType === "new_customer" 
          ? config.newCustomerGoalRate 
          : config.renewalGoalRate;
        
        goalsEarned = dealValue / goalRate;
        
        console.log(`✅ Calculated goals for deal ${id}:`, {
          dealValue,
          dealType: deal.dealType,
          goalRate,
          goalsEarned,
          region: user.region,
          category: user.regionCategory,
          subcategory: user.regionSubcategory,
        });
      } else {
        console.warn(`⚠️ No region config found for user ${user.id}:`, {
          region: user.region,
          category: user.regionCategory,
          subcategory: user.regionSubcategory,
        });
      }
    }

    const [updatedDeal] = await db
      .update(deals)
      .set({
        status: "approved",
        pointsEarned,
        goalsEarned: goalsEarned.toFixed(2),
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deals.id, id))
      .returning();

    // Add points to history
    if (updatedDeal && pointsEarned > 0) {
      await this.addPointsHistory({
        userId: updatedDeal.userId,
        dealId: id,
        points: pointsEarned,
        description: `Points earned for deal: ${deal.productName}`,
      });

      // Enviar notificación en tiempo real
      await NotificationHelpers.dealApproved(
        updatedDeal.userId,
        id,
        pointsEarned
      );
    }

    // Add goals to history
    if (updatedDeal && goalsEarned > 0 && regionConfigId) {
      const approvalDate = new Date();
      await db.insert(goalsHistory).values({
        userId: updatedDeal.userId,
        dealId: id,
        goals: goalsEarned.toFixed(2),
        month: approvalDate.getMonth() + 1, // 1-12
        year: approvalDate.getFullYear(),
        regionConfigId: regionConfigId,
        description: `${goalsEarned.toFixed(2)} goals earned from ${deal.dealType === "new_customer" ? "new customer" : "renewal"} deal: ${deal.productName}`,
      });

      console.log(`📊 Goals history created for user ${updatedDeal.userId}: ${goalsEarned.toFixed(2)} goals`);
    }

    return updatedDeal || undefined;
  }

  // Recalculate points for all existing deals based on new formula
  async recalculateAllDealsPoints(): Promise<{
    updated: number;
    errors: string[];
  }> {
    const allDeals = await db.select().from(deals);
    let updated = 0;
    const errors: string[] = [];

    for (const deal of allDeals) {
      try {
        const newPoints = await this.calculatePointsForDeal(
          deal.dealType,
          Number(deal.dealValue),
        );

        // Only update if points changed or deal is approved
        if (
          (deal.pointsEarned || 0) !== newPoints &&
          deal.status === "approved"
        ) {
          await db
            .update(deals)
            .set({
              pointsEarned: newPoints,
              updatedAt: new Date(),
            })
            .where(eq(deals.id, deal.id));

          // Update points history - remove old entry if exists and add new one
          if (newPoints > 0) {
            // Remove old points history for this deal
            await db
              .delete(pointsHistory)
              .where(eq(pointsHistory.dealId, deal.id));

            // Add new points history entry
            await this.addPointsHistory({
              userId: deal.userId,
              dealId: deal.id,
              points: newPoints,
              description: `Points recalculated for deal: ${deal.productName}`,
            });
          }

          updated++;
        } else if (deal.status !== "approved" && (deal.pointsEarned || 0) > 0) {
          // Reset points for non-approved deals
          await db
            .update(deals)
            .set({
              pointsEarned: 0,
              updatedAt: new Date(),
            })
            .where(eq(deals.id, deal.id));

          // Remove points history for non-approved deals
          await db
            .delete(pointsHistory)
            .where(eq(pointsHistory.dealId, deal.id));

          updated++;
        }
      } catch (error) {
        errors.push(`Failed to update deal ${deal.id}: ${error}`);
      }
    }

    return { updated, errors };
  }

  async rejectDeal(id: string): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();

    // Enviar notificación en tiempo real
    if (updatedDeal) {
      await NotificationHelpers.dealRejected(updatedDeal.userId, id);
    }

    return updatedDeal || undefined;
  }

  async updateDeal(id: string, updates: UpdateDeal): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updatedDeal || undefined;
  }

  async getRecentDeals(userId: string, limit = 10): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(desc(deals.createdAt))
      .limit(limit);
  }

  async getRewards(regionName?: string): Promise<Reward[]> {
    if (regionName) {
      // Usuario con región: solo ve rewards de su región
      return await db
        .select()
        .from(rewards)
        .where(and(
          eq(rewards.isActive, true),
          eq(rewards.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO")
        ))
        .orderBy(rewards.pointsCost);
    }
    
    // Sin región (super admin o sin autenticar): ve todos los rewards
    return await db
      .select()
      .from(rewards)
      .where(eq(rewards.isActive, true))
      .orderBy(rewards.pointsCost);
  }

  async getReward(id: string): Promise<Reward | undefined> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, id));
    return reward || undefined;
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [createdReward] = await db.insert(rewards).values(reward).returning();
    return createdReward;
  }

  async updateReward(
    id: string,
    updates: Partial<Reward>,
  ): Promise<Reward | undefined> {
    const [updatedReward] = await db
      .update(rewards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rewards.id, id))
      .returning();
    return updatedReward || undefined;
  }

  async deleteReward(id: string): Promise<Reward | undefined> {
    const [deletedReward] = await db
      .delete(rewards)
      .where(eq(rewards.id, id))
      .returning();
    return deletedReward || undefined;
  }

  async redeemReward(userId: string, rewardId: string): Promise<UserReward> {
    const reward = await this.getReward(rewardId);
    if (!reward) throw new Error("Reward not found");

    // Check if user already has a pending redemption for this reward
    const [existingRedemption] = await db
      .select()
      .from(userRewards)
      .where(
        and(
          eq(userRewards.userId, userId),
          eq(userRewards.rewardId, rewardId),
          eq(userRewards.status, "pending"),
        ),
      );

    if (existingRedemption) {
      throw new Error("You already have a pending redemption for this reward");
    }

    const availablePoints = await this.getUserAvailablePoints(userId);
    if (availablePoints < reward.pointsCost) {
      throw new Error("Insufficient points");
    }

    // Create pending redemption record
    const [userReward] = await db
      .insert(userRewards)
      .values({
        userId,
        rewardId,
        status: "pending",
      })
      .returning();

    // Enviar notificación en tiempo real
    await NotificationHelpers.rewardRedeemed(
      userId,
      reward.name,
      reward.pointsCost
    );

    // Don't deduct points yet - wait for approval
    return userReward;
  }

  async approveRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
  ): Promise<UserReward | undefined> {
    // Get the reward redemption
    const [redemption] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.id, rewardRedemptionId));
    if (!redemption) throw new Error("Redemption not found");

    if (redemption.status !== "pending") {
      throw new Error("Redemption is not pending");
    }

    const reward = await this.getReward(redemption.rewardId);
    if (!reward) throw new Error("Reward not found");

    // Update redemption status
    const [updatedRedemption] = await db
      .update(userRewards)
      .set({
        status: "approved",
        approvedBy: adminId,
        approvedAt: new Date(),
      })
      .where(eq(userRewards.id, rewardRedemptionId))
      .returning();

    // Now deduct points
    await this.addPointsHistory({
      userId: redemption.userId,
      rewardId: redemption.rewardId,
      points: -reward.pointsCost,
      description: `Points redeemed for: ${reward.name}`,
    });

    // Enviar notificación en tiempo real
    await NotificationHelpers.rewardApproved(redemption.userId, reward.name);

    return updatedRedemption || undefined;
  }

  async rejectRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
    reason?: string,
  ): Promise<UserReward | undefined> {
    // Get the redemption to access reward info
    const [redemption] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.id, rewardRedemptionId));
    
    const reward = redemption ? await this.getReward(redemption.rewardId) : null;

    const [updatedRedemption] = await db
      .update(userRewards)
      .set({
        status: "rejected",
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(userRewards.id, rewardRedemptionId))
      .returning();

    // Enviar notificación en tiempo real (puntos no fueron deducidos, así que no hay reembolso)
    if (updatedRedemption && reward) {
      await NotificationHelpers.rewardRejected(
        updatedRedemption.userId,
        reward.name,
        reward.pointsCost
      );
    }

    return updatedRedemption || undefined;
  }

  async getPendingRewardRedemptions(regionName?: string): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
      }
    >
  > {
    const conditions = [eq(userRewards.status, "pending")];

    if (regionName) {
      // Regional admin: solo ve redenciones de usuarios de su REGIÓN
      conditions.push(eq(users.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO")); // Filtra directamente por región
    }

    const result = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        status: userRewards.status,
        approvedBy: userRewards.approvedBy,
        approvedAt: userRewards.approvedAt,
        rejectionReason: userRewards.rejectionReason,
        redeemedAt: userRewards.redeemedAt,
        deliveredAt: userRewards.deliveredAt,
        deliveryAddress: userRewards.deliveryAddress,
        shipmentStatus: userRewards.shipmentStatus,
        shippedAt: userRewards.shippedAt,
        shippedBy: userRewards.shippedBy,
        userName: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        rewardName: rewards.name,
      })
      .from(userRewards)
      .leftJoin(users, eq(userRewards.userId, users.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(and(...conditions))
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
      }
    >;
  }

  async getUserRewards(userId: string): Promise<UserReward[]> {
    return await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.redeemedAt));
  }

  async getAllRewardRedemptions(): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
        pointsCost?: number;
      }
    >
  > {
    const result = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        status: userRewards.status,
        shipmentStatus: userRewards.shipmentStatus,
        approvedBy: userRewards.approvedBy,
        approvedAt: userRewards.approvedAt,
        rejectionReason: userRewards.rejectionReason,
        redeemedAt: userRewards.redeemedAt,
        deliveredAt: userRewards.deliveredAt,
        deliveryAddress: userRewards.deliveryAddress,
        shippedAt: userRewards.shippedAt,
        shippedBy: userRewards.shippedBy,
        userName: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        rewardName: rewards.name,
        pointsCost: rewards.pointsCost,
      })
      .from(userRewards)
      .leftJoin(users, eq(userRewards.userId, users.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
        pointsCost?: number;
      }
    >;
  }

  async getUserRewardsWithDetails(
    userId: string,
  ): Promise<Array<UserReward & { rewardName?: string; pointsCost?: number; imageUrl?: string }>> {
    const result = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        status: userRewards.status,
        shipmentStatus: userRewards.shipmentStatus,
        approvedBy: userRewards.approvedBy,
        approvedAt: userRewards.approvedAt,
        rejectionReason: userRewards.rejectionReason,
        redeemedAt: userRewards.redeemedAt,
        deliveredAt: userRewards.deliveredAt,
        deliveryAddress: userRewards.deliveryAddress,
        shippedAt: userRewards.shippedAt,
        shippedBy: userRewards.shippedBy,
        rewardName: rewards.name,
        pointsCost: rewards.pointsCost,
        imageUrl: rewards.imageUrl,
      })
      .from(userRewards)
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<
      UserReward & { rewardName?: string; pointsCost?: number; imageUrl?: string }
    >;
  }

  async updateRewardShipmentStatus(
    rewardRedemptionId: string,
    shipmentStatus: "pending" | "shipped" | "delivered",
    adminId: string,
  ): Promise<UserReward | undefined> {
    // Get the current redemption to access reward and user info
    const [currentRedemption] = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        rewardName: rewards.name,
      })
      .from(userRewards)
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(eq(userRewards.id, rewardRedemptionId));

    if (!currentRedemption) {
      return undefined;
    }

    const updateData: any = {
      shipmentStatus,
      shippedBy: adminId,
    };

    if (shipmentStatus === "shipped") {
      updateData.shippedAt = new Date();
    } else if (shipmentStatus === "delivered") {
      updateData.deliveredAt = new Date();
    }

    const [updatedRedemption] = await db
      .update(userRewards)
      .set(updateData)
      .where(eq(userRewards.id, rewardRedemptionId))
      .returning();

    // Enviar notificación en tiempo real
    if (updatedRedemption && currentRedemption.rewardName) {
      await NotificationHelpers.shipmentUpdated(
        currentRedemption.userId,
        currentRedemption.rewardName,
        shipmentStatus
      );
    }

    return updatedRedemption || undefined;
  }

  async addPointsHistory(entry: InsertPointsHistory): Promise<PointsHistory> {
    const [pointsEntry] = await db
      .insert(pointsHistory)
      .values(entry)
      .returning();
    return pointsEntry;
  }

  async getUserPointsHistory(userId: string): Promise<PointsHistory[]> {
    return await db
      .select()
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId))
      .orderBy(desc(pointsHistory.createdAt));
  }

  async getUserTotalPoints(userId: string): Promise<number> {
    const [result] = await db
      .select({ total: sum(pointsHistory.points) })
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId));
    return Number(result?.total || 0);
  }

  async getUserAvailablePoints(userId: string): Promise<number> {
    const [result] = await db
      .select({ total: sum(pointsHistory.points) })
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId));
    return Math.max(0, Number(result?.total || 0));
  }

  async getTopUsersByPoints(limit = 5): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      totalPoints: number;
    }>
  > {
    const result = await db
      .select({
        userId: pointsHistory.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        totalPoints: sum(pointsHistory.points),
      })
      .from(pointsHistory)
      .innerJoin(users, eq(pointsHistory.userId, users.id))
      .groupBy(
        pointsHistory.userId,
        users.username,
        users.firstName,
        users.lastName,
      )
      .having(sql`SUM(${pointsHistory.points}) > 0`)
      .orderBy(desc(sum(pointsHistory.points)))
      .limit(limit);

    return result.map((row) => ({
      userId: row.userId,
      username: row.username || "",
      firstName: row.firstName || "",
      lastName: row.lastName || "",
      totalPoints: Number(row.totalPoints || 0),
    }));
  }

  async getCampaigns(region?: Region): Promise<Campaign[]> {
    if (region) {
      return await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.region, region))
        .orderBy(desc(campaigns.createdAt));
    }
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }

  async updateCampaign(
    id: string,
    updates: Partial<Campaign>
  ): Promise<Campaign | undefined> {
    const [updated] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCampaign(id: string): Promise<Campaign | undefined> {
    const [deleted] = await db
      .delete(campaigns)
      .where(eq(campaigns.id, id))
      .returning();
    return deleted || undefined;
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    const now = new Date();
    return await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.isActive, true),
          lte(campaigns.startDate, now),
          gte(campaigns.endDate, now),
        ),
      );
  }

  async getAllUsers(regionName?: string): Promise<User[]> {
    if (regionName) {
      // Regional admin: solo ve usuarios de su REGIÓN (NOLA, SOLA, BRASIL, MEXICO)
      // Excluir super-admins (que tienen region diferente o roles especiales)
      return await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"),
            ne(users.role, "super-admin") // Excluir super-admins
          )
        )
        .orderBy(desc(users.createdAt));
    }
    // Super admin: ve todos los usuarios
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getPendingUsers(regionName?: string): Promise<User[]> {
    // Only show users who completed registration (have username/password) but are not approved yet
    // Users who only have invite token (haven't registered yet) should NOT appear here
    const conditions = [
      eq(users.isActive, true), 
      eq(users.isApproved, false),
      isNotNull(users.username), // Only users who completed registration
      ne(users.role, "super-admin") // Excluir super-admins de la lista de pendientes
    ];

    if (regionName) {
      // Regional admin: solo ve usuarios pendientes de su REGIÓN
      conditions.push(eq(users.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO")); // Filtra directamente por región
    }

    return db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));
  }

  async approveUser(
    userId: string,
    approvedBy: string,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isApproved: true,
        approvedBy: approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async rejectUser(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateUserRole(
    userId: string,
    role: "user" | "admin",
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(userId: string): Promise<User | undefined> {
    // First, get all deal IDs associated with this user
    const userDeals = await db
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.userId, userId));
    
    const dealIds = userDeals.map(deal => deal.id);

    // Delete all goals history that references these deals
    if (dealIds.length > 0) {
      await db.delete(goalsHistory).where(inArray(goalsHistory.dealId, dealIds));
    }

    // Delete all support tickets associated with this user
    await db.delete(supportTickets).where(eq(supportTickets.userId, userId));

    // Delete all notifications associated with this user
    await db.delete(notifications).where(eq(notifications.userId, userId));

    // Delete all points history associated with this user
    await db.delete(pointsHistory).where(eq(pointsHistory.userId, userId));

    // Delete all user rewards associated with this user
    await db.delete(userRewards).where(eq(userRewards.userId, userId));

    // Then, delete all deals associated with this user
    await db.delete(deals).where(eq(deals.userId, userId));

    // Finally, delete the user
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();
    return deletedUser || undefined;
  }

  async getAllDeals(
    page: number = 1,
    limit: number = 20,
    regionName?: string,
  ): Promise<{ deals: DealWithUser[]; total: number }> {
    // Get total count with region filter
    const countQuery = regionName
      ? db.select({ count: count() }).from(deals).leftJoin(users, eq(deals.userId, users.id)).where(eq(users.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"))
      : db.select({ count: count() }).from(deals);
    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    let query = db
      .select({
        id: deals.id,
        userId: deals.userId,
        regionId: deals.regionId,
        productType: deals.productType,
        productName: deals.productName,
        dealValue: deals.dealValue,
        dealType: deals.dealType,
        quantity: deals.quantity,
        closeDate: deals.closeDate,
        clientInfo: deals.clientInfo,
        licenseAgreementNumber: deals.licenseAgreementNumber,
        status: deals.status,
        pointsEarned: deals.pointsEarned,
        goalsEarned: deals.goalsEarned,
        approvedBy: deals.approvedBy,
        approvedAt: deals.approvedAt,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userName: users.username,
      })
      .from(deals)
      .leftJoin(users, eq(deals.userId, users.id))
      .orderBy(desc(deals.createdAt))
      .limit(limit)
      .offset(offset);

    const result = regionName
      ? await query.where(eq(users.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"))
      : await query;

    return {
      deals: result as DealWithUser[],
      total: totalCount,
    };
  }

  async getReportsData(filters: {
    country?: string;
    startDate?: Date;
    endDate?: Date;
    regionName?: string; // Nuevo filtro de región
  }): Promise<{
    userCount: number;
    dealCount: number;
    totalRevenue: number;
    redeemedRewards: number;
  }> {
    // Apply filters
    const userConditions = [];
    const dealConditions = [];

    // Filtro de región para regional-admin
    if (filters.regionName) {
      userConditions.push(eq(users.region, filters.regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"));
    }

    if (filters.country) {
      userConditions.push(eq(users.country, filters.country));
    }
    if (filters.startDate) {
      dealConditions.push(gte(deals.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dealConditions.push(lte(deals.createdAt, filters.endDate));
    }

    // Always filter deals by approved status
    dealConditions.unshift(eq(deals.status, "approved"));

    // Build user count query
    const userQueryBuilder = db.select({ count: count() }).from(users);
    const [userResult] =
      userConditions.length > 0
        ? await userQueryBuilder.where(and(...userConditions))
        : await userQueryBuilder;

    // Build deal query with region filter
    let dealQueryBuilder = db
      .select({
        count: count(),
        revenue: sum(deals.dealValue),
      })
      .from(deals);

    // Si hay filtro de región, join con users para filtrar por región del usuario
    if (filters.regionName) {
      dealQueryBuilder = dealQueryBuilder.leftJoin(users, eq(deals.userId, users.id)) as any;
      dealConditions.push(eq(users.region, filters.regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"));
    }

    const [dealResult] = await dealQueryBuilder.where(and(...dealConditions));

    // Build reward redemptions query with region filter
    let rewardQueryBuilder = db
      .select({ count: count() })
      .from(pointsHistory)
      .where(isNotNull(pointsHistory.rewardId));

    // Si hay filtro de región, join con users
    if (filters.regionName) {
      const rewardResult = await db
        .select({ count: count() })
        .from(pointsHistory)
        .leftJoin(users, eq(pointsHistory.userId, users.id))
        .where(
          and(
            isNotNull(pointsHistory.rewardId),
            eq(users.region, filters.regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO")
          )
        );
      
      return {
        userCount: userResult?.count || 0,
        dealCount: dealResult?.count || 0,
        totalRevenue: Number(dealResult?.revenue || 0),
        redeemedRewards: rewardResult[0]?.count || 0,
      };
    }

    const [rewardResult] = await rewardQueryBuilder;

    return {
      userCount: userResult?.count || 0,
      dealCount: dealResult?.count || 0,
      totalRevenue: Number(dealResult?.revenue || 0),
      redeemedRewards: rewardResult?.count || 0,
    };
  }

  async getUserRankingReport(filters: {
    startDate?: Date;
    endDate?: Date;
    regionName?: string;
  }): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      country: string;
      totalPoints: number;
      totalDeals: number;
      totalSales: number;
    }>
  > {
    const dealConditions = [eq(deals.status, "approved")];
    const pointsConditions = [];
    const userConditions = [eq(users.role, "user")];

    if (filters.startDate) {
      dealConditions.push(gte(deals.createdAt, filters.startDate));
      pointsConditions.push(gte(pointsHistory.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dealConditions.push(lte(deals.createdAt, filters.endDate));
      pointsConditions.push(lte(pointsHistory.createdAt, filters.endDate));
    }
    
    // Add region filter if provided
    if (filters.regionName) {
      userConditions.push(eq(users.region, filters.regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"));
    }

    // Get user points in the date range - only sum POSITIVE points (earned points, not redeemed)
    // Add condition to only include earned points (positive values), not spent points (negative values)
    pointsConditions.push(gt(pointsHistory.points, 0));

    const pointsQuery = db
      .select({
        userId: pointsHistory.userId,
        totalPoints: sum(pointsHistory.points).as("totalPoints"),
      })
      .from(pointsHistory)
      .where(pointsConditions.length > 0 ? and(...pointsConditions) : undefined)
      .groupBy(pointsHistory.userId);

    // Get user deals in the date range
    const dealsQuery = db
      .select({
        userId: deals.userId,
        totalDeals: count(deals.id).as("totalDeals"),
        totalSales: sum(deals.dealValue).as("totalSales"),
      })
      .from(deals)
      .where(and(...dealConditions))
      .groupBy(deals.userId);

    // Get all users with their basic info - filtered by region if provided
    const usersResult = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        country: users.country,
      })
      .from(users)
      .where(and(...userConditions));

    const pointsResult = await pointsQuery;
    const dealsResult = await dealsQuery;

    // Combine all data
    const userRanking = usersResult.map((user) => {
      const userPoints = pointsResult.find((p) => p.userId === user.id);
      const userDeals = dealsResult.find((d) => d.userId === user.id);

      return {
        userId: user.id,
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        country: user.country || "",
        totalPoints: Number(userPoints?.totalPoints || 0),
        totalDeals: Number(userDeals?.totalDeals || 0),
        totalSales: Number(userDeals?.totalSales || 0),
      };
    });

    // Sort by points in descending order
    return userRanking.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getRewardRedemptionsReport(filters: {
    startDate?: Date;
    endDate?: Date;
    regionName?: string;
  }): Promise<
    Array<{
      userName: string;
      userFirstName: string;
      userLastName: string;
      userEmail: string;
      rewardName: string;
      pointsCost: number;
      status: string;
      redeemedAt: Date;
      approvedAt: Date | null;
    }>
  > {
    const conditions = [];

    if (filters.startDate) {
      conditions.push(gte(userRewards.redeemedAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(userRewards.redeemedAt, filters.endDate));
    }
    
    // Add region filter if provided
    if (filters.regionName) {
      conditions.push(eq(users.region, filters.regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"));
    }

    const result = await db
      .select({
        userName: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        rewardName: rewards.name,
        pointsCost: rewards.pointsCost,
        status: userRewards.status,
        redeemedAt: userRewards.redeemedAt,
        approvedAt: userRewards.approvedAt,
      })
      .from(userRewards)
      .leftJoin(users, eq(userRewards.userId, users.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<{
      userName: string;
      userFirstName: string;
      userLastName: string;
      userEmail: string;
      rewardName: string;
      pointsCost: number;
      status: string;
      redeemedAt: Date;
      approvedAt: Date | null;
    }>;
  }

  async getDealsPerUserReport(filters: {
    startDate?: Date;
    endDate?: Date;
    regionName?: string;
  }): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      country: string;
      totalDeals: number;
      totalSales: number;
      averageDealSize: number;
    }>
  > {
    const dealConditions = [eq(deals.status, "approved")];
    const userConditions = [eq(users.role, "user")];

    if (filters.startDate) {
      dealConditions.push(gte(deals.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dealConditions.push(lte(deals.createdAt, filters.endDate));
    }
    
    // Add region filter if provided
    if (filters.regionName) {
      userConditions.push(eq(users.region, filters.regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO"));
    }

    // Get user deals in the date range
    const dealsQuery = db
      .select({
        userId: deals.userId,
        totalDeals: count(deals.id).as("totalDeals"),
        totalSales: sum(deals.dealValue).as("totalSales"),
      })
      .from(deals)
      .where(and(...dealConditions))
      .groupBy(deals.userId);

    // Get all users with their basic info - filtered by region if provided
    const usersResult = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        country: users.country,
      })
      .from(users)
      .where(and(...userConditions));

    const dealsResult = await dealsQuery;

    // Combine all data
    const dealsPerUser = usersResult.map((user) => {
      const userDeals = dealsResult.find((d) => d.userId === user.id);
      const totalDeals = Number(userDeals?.totalDeals || 0);
      const totalSales = Number(userDeals?.totalSales || 0);
      const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;

      return {
        userId: user.id,
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        country: user.country || "",
        totalDeals: totalDeals,
        totalSales: totalSales,
        averageDealSize: Math.round(averageDealSize * 100) / 100, // Round to 2 decimal places
      };
    });

    // Sort by total deals in descending order, then by total sales
    return dealsPerUser.sort((a, b) => {
      if (b.totalDeals !== a.totalDeals) {
        return b.totalDeals - a.totalDeals;
      }
      return b.totalSales - a.totalSales;
    });
  }

  async createNotification(
    notification: InsertNotification,
  ): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return userNotifications;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification || undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async createSupportTicket(
    ticket: InsertSupportTicket,
  ): Promise<SupportTicket> {
    const [newTicket] = await db
      .insert(supportTickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket || undefined;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
    return tickets;
  }

  async getAllSupportTickets(regionName?: string): Promise<SupportTicketWithUser[]> {
    let query = db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        message: supportTickets.message,
        status: supportTickets.status,
        priority: supportTickets.priority,
        assignedTo: supportTickets.assignedTo,
        adminResponse: supportTickets.adminResponse,
        respondedAt: supportTickets.respondedAt,
        respondedBy: supportTickets.respondedBy,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userName: users.username,
        userEmail: users.email,
        userRegion: users.region,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt));

    if (regionName) {
      // Regional admin: solo ve tickets de usuarios de su REGIÓN
      const tickets = await query.where(eq(users.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO")); // Filtra directamente por región
      return tickets as SupportTicketWithUser[];
    }

    const tickets = await query;
    return tickets as SupportTicketWithUser[];
  }

  async updateSupportTicket(
    id: string,
    updates: UpdateSupportTicket,
  ): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket || undefined;
  }

  async getPointsConfig(): Promise<PointsConfig | undefined> {
    const [config] = await db.select().from(pointsConfig).limit(1);
    return config || undefined;
  }

  async updatePointsConfig(
    updates: UpdatePointsConfig,
    updatedBy: string,
  ): Promise<PointsConfig | undefined> {
    const existingConfig = await this.getPointsConfig();

    // Filter out undefined values to avoid Drizzle type errors
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (!existingConfig) {
      const [newConfig] = await db
        .insert(pointsConfig)
        .values({
          ...filteredUpdates,
          updatedBy,
          updatedAt: new Date(),
        } as any)
        .returning();
      return newConfig;
    }

    const [config] = await db
      .update(pointsConfig)
      .set({ ...filteredUpdates, updatedBy, updatedAt: new Date() })
      .where(eq(pointsConfig.id, existingConfig.id))
      .returning();
    return config || undefined;
  }

  async getPointsConfigByRegion(region: string): Promise<PointsConfig | undefined> {
    const [config] = await db
      .select()
      .from(pointsConfig)
      .where(eq(pointsConfig.region, region as any))
      .limit(1);
    return config || undefined;
  }

  async updatePointsConfigByRegion(
    updates: UpdatePointsConfig,
    updatedBy: string,
  ): Promise<PointsConfig | undefined> {
    const existingConfig = await this.getPointsConfigByRegion(updates.region!);

    if (!existingConfig) {
      // Crear nueva configuración para esta región
      const [newConfig] = await db
        .insert(pointsConfig)
        .values({
          ...updates,
          region: updates.region as any,
          updatedBy,
          updatedAt: new Date(),
        })
        .returning();
      return newConfig;
    }

    // Actualizar configuración existente
    const [config] = await db
      .update(pointsConfig)
      .set({ ...updates, updatedBy, updatedAt: new Date() })
      .where(eq(pointsConfig.id, existingConfig.id))
      .returning();
    return config || undefined;
  }

  // ═══════════════════════════════════════════════
  // Regions methods
  // ═══════════════════════════════════════════════

  async getAllRegionConfigs(regionName?: string): Promise<RegionConfig[]> {
    // Si hay filtro de región, solo traer configs de esa región
    if (regionName) {
      const configs = await db
        .select()
        .from(regionConfigs)
        .where(
          and(
            eq(regionConfigs.isActive, true),
            eq(regionConfigs.region, regionName as "NOLA" | "SOLA" | "BRASIL" | "MEXICO")
          )
        )
        .orderBy(regionConfigs.region, regionConfigs.category);
      return configs;
    }

    // Super-admin: traer todas las configs
    const configs = await db
      .select()
      .from(regionConfigs)
      .where(eq(regionConfigs.isActive, true))
      .orderBy(regionConfigs.region, regionConfigs.category);
    return configs;
  }

  async getRegionConfig(id: string): Promise<RegionConfig | undefined> {
    const [config] = await db
      .select()
      .from(regionConfigs)
      .where(eq(regionConfigs.id, id));
    return config || undefined;
  }

  async createRegionConfig(config: InsertRegionConfig): Promise<RegionConfig> {
    console.log("Storage createRegionConfig called with:", config);
    console.log("RewardId in storage:", config.rewardId, "Type:", typeof config.rewardId);

    // Normalizar rewardId: aceptar null, undefined o cadena vacía como null
    const normalizedRewardId = config.rewardId && config.rewardId !== "" ? config.rewardId : null;

    // Convertir expirationDate de string a Date si viene como string
    const processedConfig = {
      ...config,
      rewardId: normalizedRewardId,
      expirationDate: config.expirationDate 
        ? new Date(config.expirationDate) 
        : null,
    };

    console.log("Processed config before insert:", processedConfig);

    const [newConfig] = await db
      .insert(regionConfigs)
      .values(processedConfig)
      .returning();

    console.log("Created region config:", newConfig);
    return newConfig;
  }

  async updateRegionConfig(
    id: string,
    updates: Partial<RegionConfig>
  ): Promise<RegionConfig | undefined> {
    // Normalizar rewardId y convertir expirationDate de string a Date si viene como string
    const processedUpdates: any = {
      ...updates,
      rewardId: updates.rewardId !== undefined ? (updates.rewardId && updates.rewardId !== "" ? updates.rewardId : null) : undefined,
      expirationDate: updates.expirationDate !== undefined
        ? (updates.expirationDate ? new Date(updates.expirationDate) : null)
        : undefined,
      updatedAt: new Date(),
    };
    
    const [updated] = await db
      .update(regionConfigs)
      .set(processedUpdates)
      .where(eq(regionConfigs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRegionConfig(id: string): Promise<RegionConfig | undefined> {
    // Primero eliminar los premios mensuales asociados
    await db
      .delete(monthlyRegionPrizes)
      .where(eq(monthlyRegionPrizes.regionConfigId, id));
    
    // Luego eliminar la configuración de región
    const [deleted] = await db
      .delete(regionConfigs)
      .where(eq(regionConfigs.id, id))
      .returning();
    return deleted || undefined;
  }

  async getMonthlyRegionPrizes(
    regionConfigId: string,
    month: number,
    year: number,
  ): Promise<MonthlyRegionPrize[]> {
    const prizes = await db
      .select()
      .from(monthlyRegionPrizes)
      .where(
        and(
          eq(monthlyRegionPrizes.regionConfigId, regionConfigId),
          eq(monthlyRegionPrizes.month, month),
          eq(monthlyRegionPrizes.year, year),
          eq(monthlyRegionPrizes.isActive, true)
        )
      );
    return prizes;
  }

  async seedRegions(): Promise<void> {
    console.log("🌱 Seeding regions...");

    // NOLA Regions
    const nolaConfigs: InsertRegionConfig[] = [
      {
        region: "NOLA",
        category: "ENTERPRISE",
        subcategory: "COLOMBIA",
        name: "NOLA ENTERPRISE COLOMBIA",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 10,
        isActive: true,
      },
      {
        region: "NOLA",
        category: "ENTERPRISE",
        subcategory: "CENTRO AMÉRICA",
        name: "NOLA ENTERPRISE CENTRO AMÉRICA",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 10,
        isActive: true,
      },
      {
        region: "NOLA",
        category: "SMB",
        subcategory: "COLOMBIA",
        name: "NOLA SMB COLOMBIA",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 8,
        isActive: true,
      },
      {
        region: "NOLA",
        category: "SMB",
        subcategory: "CENTRO AMÉRICA",
        name: "NOLA SMB CENTRO AMÉRICA",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 8,
        isActive: true,
      },
      {
        region: "NOLA",
        category: "MSSP",
        subcategory: null,
        name: "NOLA MSSP",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 5,
        isActive: true,
      },
    ];

    // SOLA Regions
    const solaConfigs: InsertRegionConfig[] = [
      {
        region: "SOLA",
        category: "ENTERPRISE",
        subcategory: null,
        name: "SOLA ENTERPRISE",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 12,
        isActive: true,
      },
      {
        region: "SOLA",
        category: "SMB",
        subcategory: null,
        name: "SOLA SMB",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 10,
        isActive: true,
      },
    ];

    // BRASIL Regions
    const brasilConfigs: InsertRegionConfig[] = [
      {
        region: "BRASIL",
        category: "ENTERPRISE",
        subcategory: null,
        name: "BRASIL ENTERPRISE",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 15,
        isActive: true,
      },
      {
        region: "BRASIL",
        category: "SMB",
        subcategory: null,
        name: "BRASIL SMB",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 12,
        isActive: true,
      },
    ];

    // MÉXICO Regions
    const mexicoConfigs: InsertRegionConfig[] = [
      {
        region: "MEXICO",
        category: "ENTERPRISE",
        subcategory: "PLATINUM",
        name: "MÉXICO ENTERPRISE PLATINUM",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 20,
        isActive: true,
      },
      {
        region: "MEXICO",
        category: "ENTERPRISE",
        subcategory: "GOLD",
        name: "MÉXICO ENTERPRISE GOLD",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 15,
        isActive: true,
      },
      {
        region: "MEXICO",
        category: "SMB",
        subcategory: "PLATINUM",
        name: "MÉXICO SMB PLATINUM",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 12,
        isActive: true,
      },
      {
        region: "MEXICO",
        category: "SMB",
        subcategory: "GOLD",
        name: "MÉXICO SMB GOLD",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 10,
        isActive: true,
      },
      {
        region: "MEXICO",
        category: "SMB",
        subcategory: "SILVER & REGISTERED",
        name: "MÉXICO SMB SILVER & REGISTERED",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 8,
        isActive: true,
      },
    ];

    // Insertar todas las configuraciones
    const allConfigs = [
      ...nolaConfigs,
      ...solaConfigs,
      ...brasilConfigs,
      ...mexicoConfigs,
    ];

    const insertedConfigs = await db
      .insert(regionConfigs)
      .values(allConfigs)
      .returning();
    console.log(`✅ ${insertedConfigs.length} region configs created`);

    // Premios mensuales según el calendario proporcionado
    const monthlyPrizesData = [
      { month: 11, monthName: "NOVEMBER", prizeName: "RAPPI BONUS" },
      { month: 12, monthName: "DECEMBER", prizeName: "WORLD CUP HAT EMBLEM" },
      { month: 1, monthName: "JANUARY", prizeName: "WORLD CUP SOCCER BALL" },
      { month: 2, monthName: "FEBRUARY", prizeName: "WORLD CUP T-SHIRT" },
      { month: 3, monthName: "MARCH", prizeName: "EARBUDS BOSE" },
      { month: 4, monthName: "APRIL", prizeName: "SPEAKER" },
    ];

    const currentYear = 2025;
    const regionPrizes: InsertMonthlyRegionPrize[] = [];

    // Crear premios para cada región y cada mes
    for (const config of insertedConfigs) {
      for (const prize of monthlyPrizesData) {
        regionPrizes.push({
          regionConfigId: config.id,
          month: prize.month,
          year: currentYear,
          prizeName: prize.prizeName,
          prizeDescription: `Sorteo mensual de ${prize.monthName} para ${config.name}`,
          goalTarget: config.monthlyGoalTarget || 10,
          isActive: true,
        });
      }
    }

    const insertedPrizes = await db
      .insert(monthlyRegionPrizes)
      .values(regionPrizes)
      .returning();
    console.log(`✅ ${insertedPrizes.length} monthly prizes created`);

    console.log("🎉 Seeding completed successfully!");
  }

  // ═══════════════════════════════════════════════
  // Extended Region Config methods
  // ═══════════════════════════════════════════════

  async getRegionConfigs(): Promise<RegionConfig[]> {
    const configs = await db
      .select()
      .from(regionConfigs)
      .orderBy(regionConfigs.region, regionConfigs.category);
    return configs;
  }

  // ═══════════════════════════════════════════════
  // Grand Prize methods
  // ═══════════════════════════════════════════════

  async getActiveGrandPrizeCriteria(region?: string): Promise<GrandPrizeCriteria | undefined> {
    if (region) {
      const [criteria] = await db
        .select()
        .from(grandPrizeCriteria)
        .where(and(
          eq(grandPrizeCriteria.isActive, true),
          eq(grandPrizeCriteria.region, region)
        ))
        .limit(1);
      return criteria;
    }
    
    const [criteria] = await db
      .select()
      .from(grandPrizeCriteria)
      .where(eq(grandPrizeCriteria.isActive, true))
      .limit(1);
    return criteria;
  }

  async getAllGrandPrizeCriteria(region?: string): Promise<GrandPrizeCriteria[]> {
    if (region) {
      return await db
        .select()
        .from(grandPrizeCriteria)
        .where(eq(grandPrizeCriteria.region, region))
        .orderBy(desc(grandPrizeCriteria.createdAt));
    }
    
    return await db
      .select()
      .from(grandPrizeCriteria)
      .orderBy(desc(grandPrizeCriteria.createdAt));
  }

  async createGrandPrizeCriteria(data: InsertGrandPrizeCriteria): Promise<GrandPrizeCriteria> {
    // Deactivate all other criteria
    await db
      .update(grandPrizeCriteria)
      .set({ isActive: false })
      .where(eq(grandPrizeCriteria.isActive, true));

    // Convert string dates to Date objects
    const processedData = {
      ...data,
      id: randomUUID(),
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    };

    const [newCriteria] = await db
      .insert(grandPrizeCriteria)
      .values(processedData)
      .returning();
    return newCriteria;
  }

  async updateGrandPrizeCriteria(
    id: string,
    updates: UpdateGrandPrizeCriteria,
  ): Promise<GrandPrizeCriteria | undefined> {
    // If activating this criteria, deactivate all others
    if (updates.isActive === true) {
      await db
        .update(grandPrizeCriteria)
        .set({ isActive: false })
        .where(eq(grandPrizeCriteria.isActive, true));
    }

    // Convert string dates to Date objects
    const processedUpdates: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.startDate !== undefined) {
      processedUpdates.startDate = updates.startDate ? new Date(updates.startDate) : null;
    }
    if (updates.endDate !== undefined) {
      processedUpdates.endDate = updates.endDate ? new Date(updates.endDate) : null;
    }

    const [updated] = await db
      .update(grandPrizeCriteria)
      .set(processedUpdates)
      .where(eq(grandPrizeCriteria.id, id))
      .returning();
    return updated;
  }

  async deleteGrandPrizeCriteria(id: string): Promise<void> {
    await db
      .delete(grandPrizeCriteria)
      .where(eq(grandPrizeCriteria.id, id));
  }

  async getGrandPrizeRanking(criteriaId: string): Promise<any[]> {
    const [criteria] = await db
      .select()
      .from(grandPrizeCriteria)
      .where(eq(grandPrizeCriteria.id, criteriaId));

    if (!criteria) {
      return [];
    }

    // Build query filters based on criteria
    let dealsQuery = db
      .select({
        userId: deals.userId,
        totalPoints: sum(deals.pointsEarned).mapWith(Number).as("totalPoints"),
        totalDeals: count(deals.id).as("totalDeals"),
      })
      .from(deals)
      .where(eq(deals.status, "approved"))
      .groupBy(deals.userId)
      .$dynamic();

    // Apply filters
    const filters = [];

    if (criteria.startDate) {
      filters.push(gte(deals.approvedAt, criteria.startDate));
    }
    if (criteria.endDate) {
      filters.push(lte(deals.approvedAt, criteria.endDate));
    }

    if (filters.length > 0) {
      dealsQuery = dealsQuery.where(and(...filters));
    }

    const userStats = await dealsQuery;

    // Join with user data and filter by region
    const usersWithStats = await Promise.all(
      userStats.map(async (stat) => {
        const user = await this.getUser(stat.userId);
        if (!user) return null;

        // Filter by region if specified
        if (criteria.region && criteria.region !== "all" && user.region !== criteria.region) {
          return null;
        }

        // Filter by minimum requirements
        if (criteria.minPoints && stat.totalPoints < criteria.minPoints) {
          return null;
        }
        if (criteria.minDeals && stat.totalDeals < criteria.minDeals) {
          return null;
        }

        // Calculate score based on criteria type
        let score = 0;
        if (criteria.criteriaType === "points") {
          score = stat.totalPoints;
        } else if (criteria.criteriaType === "deals") {
          score = stat.totalDeals;
        } else if (criteria.criteriaType === "combined") {
          const pointsWeight = (criteria.pointsWeight || 60) / 100;
          const dealsWeight = (criteria.dealsWeight || 40) / 100;
          score = stat.totalPoints * pointsWeight + stat.totalDeals * dealsWeight;
        }

        return {
          user,
          points: stat.totalPoints || 0,
          deals: stat.totalDeals || 0,
          score,
        };
      }),
    );

    // Filter out nulls and sort by score
    const filteredRanking = usersWithStats
      .filter((entry) => entry !== null)
      .sort((a, b) => b!.score - a!.score)
      .map((entry, index) => ({
        ...entry!,
        rank: index + 1,
      }));

    return filteredRanking;
  }

  // Monthly Prizes methods
  async getMonthlyPrizes(
    month?: number,
    year?: number,
    region?: string,
  ): Promise<MonthlyRegionPrize[]> {
    let query = db
      .select()
      .from(monthlyRegionPrizes)
      .leftJoin(regionConfigs, eq(monthlyRegionPrizes.regionConfigId, regionConfigs.id))
      .orderBy(desc(monthlyRegionPrizes.year), desc(monthlyRegionPrizes.month), asc(monthlyRegionPrizes.rank));

    const conditions = [];
    
    // Filtrar por región si se proporciona
    if (region) {
      conditions.push(eq(regionConfigs.region, region as any));
    }
    
    // Filtrar por mes si se proporciona
    if (month !== undefined) {
      conditions.push(eq(monthlyRegionPrizes.month, month));
    }
    
    // Filtrar por año si se proporciona
    if (year !== undefined) {
      conditions.push(eq(monthlyRegionPrizes.year, year));
    }

    if (conditions.length > 0) {
      const prizes = await query.where(and(...conditions));
      return prizes.map(row => row.monthly_region_prizes);
    }

    const allPrizes = await query;
    return allPrizes.map(row => row.monthly_region_prizes);
  }

  async createMonthlyPrize(
    prize: InsertMonthlyRegionPrize,
  ): Promise<MonthlyRegionPrize> {
    const [newPrize] = await db
      .insert(monthlyRegionPrizes)
      .values(prize)
      .returning();
    return newPrize;
  }

  async updateMonthlyPrize(
    id: string,
    updates: Partial<MonthlyRegionPrize>,
  ): Promise<MonthlyRegionPrize | undefined> {
    const [updatedPrize] = await db
      .update(monthlyRegionPrizes)
      .set(updates)
      .where(eq(monthlyRegionPrizes.id, id))
      .returning();
    return updatedPrize || undefined;
  }

  async deleteMonthlyPrize(id: string): Promise<void> {
    await db.delete(monthlyRegionPrizes).where(eq(monthlyRegionPrizes.id, id));
  }

  // ========================================
  // Master Data Management Methods
  // ========================================

  // Region Categories
  async getRegionCategories(): Promise<any[]> {
    const categories = await db
      .select()
      .from(regionCategories)
      .orderBy(asc(regionCategories.region), asc(regionCategories.category));
    return categories;
  }

  async createRegionCategory(data: any): Promise<any> {
    const [category] = await db
      .insert(regionCategories)
      .values({
        id: nanoid(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return category;
  }

  async updateRegionCategory(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(regionCategories)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(regionCategories.id, id))
      .returning();
    return updated;
  }

  async deleteRegionCategory(id: string): Promise<void> {
    await db.delete(regionCategories).where(eq(regionCategories.id, id));
  }

  // Categories Master (Maestro de Categorías Globales)
  async getCategoriesMaster(): Promise<any[]> {
    const categories = await db
      .select()
      .from(categoriesMaster)
      .orderBy(asc(categoriesMaster.name));
    return categories;
  }

  async createCategoryMaster(data: any): Promise<any> {
    const [category] = await db
      .insert(categoriesMaster)
      .values({
        id: nanoid(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return category;
  }

  async updateCategoryMaster(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(categoriesMaster)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(categoriesMaster.id, id))
      .returning();
    return updated;
  }

  async deleteCategoryMaster(id: string): Promise<void> {
    await db.delete(categoriesMaster).where(eq(categoriesMaster.id, id));
  }

  // Prize Templates
  async getPrizeTemplates(): Promise<any[]> {
    const templates = await db
      .select()
      .from(prizeTemplates)
      .orderBy(asc(prizeTemplates.type), asc(prizeTemplates.name));
    return templates;
  }

  async createPrizeTemplate(data: any): Promise<any> {
    const [template] = await db
      .insert(prizeTemplates)
      .values({
        id: nanoid(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return template;
  }

  async updatePrizeTemplate(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(prizeTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(prizeTemplates.id, id))
      .returning();
    return updated;
  }

  async deletePrizeTemplate(id: string): Promise<void> {
    await db.delete(prizeTemplates).where(eq(prizeTemplates.id, id));
  }

  // Product Types
  async getProductTypes(): Promise<any[]> {
    const productTypes = await db
      .select()
      .from(productTypesTable)
      .orderBy(asc(productTypesTable.category), asc(productTypesTable.name));
    return productTypes;
  }

  async createProductType(data: any): Promise<any> {
    const [productType] = await db
      .insert(productTypesTable)
      .values({
        id: nanoid(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return productType;
  }

  async updateProductType(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(productTypesTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(productTypesTable.id, id))
      .returning();
    return updated;
  }

  async deleteProductType(id: string): Promise<void> {
    await db.delete(productTypesTable).where(eq(productTypesTable.id, id));
  }

  // Top Scorers (Goleadores de la temporada)
  async getTopScorers(regionName?: string, limit: number = 10): Promise<any[]> {
    try {
      console.log('🔍 getTopScorers called with:', { regionName, limit });
      
      // Build query using Drizzle's sql template for safe parameter binding
      let baseQuery = sql`
        SELECT 
          u.id,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.email,
          u.region,
          COALESCE(SUM(ph.points), 0)::numeric as points
        FROM ${users} u
        LEFT JOIN ${pointsHistory} ph ON ph.user_id = u.id
        WHERE u.role = 'user'
      `;
      
      // Add region filter if specified
      if (regionName && regionName !== 'all') {
        baseQuery = sql`${baseQuery} AND u.region = ${regionName}`;
      }
      
      const finalQuery = sql`
        ${baseQuery}
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.region
        HAVING COALESCE(SUM(ph.points), 0) > 0
        ORDER BY points DESC
        LIMIT ${limit}
      `;

      console.log('📝 Executing query with region:', regionName, 'limit:', limit);

      const result = await db.execute(finalQuery);
      
      console.log('📊 Raw result from DB:', result.rows);
      
      // Convert to expected format
      const topScorers = result.rows.map((row: any) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        region: row.region,
        company: null, // Company field doesn't exist in users table
        points: Number(row.points || 0),
      }));

      console.log('✅ Processed top scorers:', topScorers);
      return topScorers;
    } catch (error) {
      console.error('❌ Error in getTopScorers:', error);
      throw error;
    }
  }

  // ───────────────────────────────────────────────
  // Audit Log Methods
  // ───────────────────────────────────────────────

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLog).values(data).returning();
    return log;
  }

  async getAuditLogs(filters?: {
    entityType?: string;
    entityId?: string;
    performedByUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    let query = db.select().from(auditLog);
    
    if (filters?.entityType) {
      query = query.where(eq(auditLog.entityType, filters.entityType)) as any;
    }
    if (filters?.entityId) {
      query = query.where(eq(auditLog.entityId, filters.entityId)) as any;
    }
    if (filters?.performedByUserId) {
      query = query.where(eq(auditLog.performedByUserId, filters.performedByUserId)) as any;
    }
    
    query = query.orderBy(desc(auditLog.performedAt)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query;
  }

  async deleteDeal(dealId: string, deletedBy: User, ipAddress?: string, userAgent?: string): Promise<Deal | undefined> {
    // Get the deal before deletion for audit log
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
    
    if (!deal) {
      return undefined;
    }

    // First, delete related points_history records
    await db.delete(pointsHistory).where(eq(pointsHistory.dealId, dealId));
    
    // Then delete the deal
    const [deleted] = await db.delete(deals).where(eq(deals.id, dealId)).returning();
    
    // Log the deletion
    await this.createAuditLog({
      action: 'delete_deal',
      entityType: 'deal',
      entityId: dealId,
      entityData: JSON.stringify(deal),
      performedByUserId: deletedBy.id,
      performedByUsername: deletedBy.username,
      performedByEmail: deletedBy.email,
      ipAddress,
      userAgent,
    });
    
    return deleted;
  }
}

export const storage = new DatabaseStorage();

