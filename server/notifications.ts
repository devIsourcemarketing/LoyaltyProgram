import { getIO } from "./socket";
import type { InsertNotification, Notification } from "@shared/schema";
import { db } from "./db";
import { notifications } from "@shared/schema";

/**
 * Crea una notificación en la BD y la emite en tiempo real vía Socket.IO
 */
export async function createAndEmitNotification(
  notification: InsertNotification
): Promise<Notification> {
  // Crear notificación en la base de datos
  const [newNotification] = await db
    .insert(notifications)
    .values(notification)
    .returning();

  // Emitir evento Socket.IO para que el usuario la reciba en tiempo real
  const io = getIO();
  io.emit(`notification:${notification.userId}`, newNotification);
  
  // También emitir a todos los admins si es una notificación importante
  if (notification.type === 'warning' || notification.type === 'error') {
    io.emit('notification:admins', newNotification);
  }

  return newNotification;
}

/**
 * Emite un evento específico de deal aprobado para actualizar el dashboard
 */
export function emitDealApprovedEvent(userId: string, dealId: string, points: number) {
  try {
    const io = getIO();
    io.emit('dealApproved', { userId, dealId, points });
    console.log(`📡 Deal approved event emitted for user ${userId}`);
  } catch (error) {
    console.warn("⚠️ Could not emit dealApproved event:", error);
  }
}

/**
 * Helper para crear notificaciones de diferentes tipos
 */
export const NotificationHelpers = {
  // Deal aprobado
  dealApproved: (userId: string, dealId: string, points: number) =>
    createAndEmitNotification({
      userId,
      title: "¡Deal Aprobado!",
      message: `Tu deal ha sido aprobado y has ganado ${points} puntos.`,
      type: "success",
    }),

  // Deal rechazado
  dealRejected: (userId: string, dealId: string) =>
    createAndEmitNotification({
      userId,
      title: "Deal Rechazado",
      message: "Tu deal ha sido rechazado. Por favor revisa los detalles y vuelve a intentarlo.",
      type: "warning",
    }),

  // Recompensa redimida (pendiente aprobación)
  rewardRedeemed: (userId: string, rewardName: string, pointsUsed: number) =>
    createAndEmitNotification({
      userId,
      title: "Redención Solicitada",
      message: `Has solicitado la recompensa "${rewardName}" por ${pointsUsed} puntos. Está pendiente de aprobación.`,
      type: "info",
    }),

  // Recompensa aprobada
  rewardApproved: (userId: string, rewardName: string) =>
    createAndEmitNotification({
      userId,
      title: "¡Recompensa Aprobada!",
      message: `Tu redención de "${rewardName}" ha sido aprobada. Pronto recibirás tu recompensa.`,
      type: "success",
    }),

  // Recompensa rechazada
  rewardRejected: (userId: string, rewardName: string, pointsRefunded: number) =>
    createAndEmitNotification({
      userId,
      title: "Redención Rechazada",
      message: `Tu redención de "${rewardName}" ha sido rechazada. ${pointsRefunded} puntos han sido reembolsados.`,
      type: "warning",
    }),

  // Estado de envío actualizado
  shipmentUpdated: (userId: string, rewardName: string, status: string) => {
    const statusMessages = {
      shipped: "Tu recompensa ha sido enviada. ¡Pronto la recibirás!",
      delivered: "¡Tu recompensa ha sido entregada!",
      pending: "Tu recompensa está siendo preparada para el envío.",
    };
    return createAndEmitNotification({
      userId,
      title: "Actualización de Envío",
      message: `${rewardName}: ${statusMessages[status as keyof typeof statusMessages] || "Estado actualizado"}`,
      type: "info",
    });
  },

  // Ticket de soporte respondido
  supportTicketResponse: (userId: string, ticketSubject: string) =>
    createAndEmitNotification({
      userId,
      title: "Respuesta a tu Ticket",
      message: `Tu ticket "${ticketSubject}" ha recibido una respuesta del equipo de soporte.`,
      type: "info",
    }),

  // Puntos agregados manualmente
  pointsAdded: (userId: string, points: number, reason: string) =>
    createAndEmitNotification({
      userId,
      title: "Puntos Agregados",
      message: `Se han agregado ${points} puntos a tu cuenta. Razón: ${reason}`,
      type: "success",
    }),

  // Notificación para admins - Nuevo deal pendiente
  newDealPending: (adminUserId: string, userName: string, dealValue: number) =>
    createAndEmitNotification({
      userId: adminUserId,
      title: "Nuevo Deal Pendiente",
      message: `${userName} ha registrado un deal por $${dealValue.toLocaleString()} que requiere aprobación.`,
      type: "info",
    }),

  // Notificación para admins - Nueva redención pendiente
  newRedemptionPending: (adminUserId: string, userName: string, rewardName: string) =>
    createAndEmitNotification({
      userId: adminUserId,
      title: "Nueva Redención Pendiente",
      message: `${userName} ha solicitado la recompensa "${rewardName}".`,
      type: "info",
    }),

  // Notificación para admins - Nuevo usuario registrado
  newUserRegistered: (adminUserId: string, userName: string, userRegion: string) =>
    createAndEmitNotification({
      userId: adminUserId,
      title: "Nuevo Usuario Registrado",
      message: `${userName} se ha registrado en la región ${userRegion} y requiere aprobación.`,
      type: "info",
    }),
};
