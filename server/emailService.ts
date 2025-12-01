/**
 * Servicio mejorado de emails con reintentos, logging y diagnóstico
 * 
 * Características:
 * - Reintentos automáticos (3 intentos por defecto)
 * - Logging en base de datos de todos los envíos
 * - Delays entre reintentos (exponential backoff)
 * - Diagnóstico y monitoreo
 * - Manejo robusto de errores de Brevo
 */

import * as brevo from '@getbrevo/brevo';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Configuración
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@loyaltyprogram.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Inicializar cliente de Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
if (BREVO_API_KEY) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
}

// Tipos
interface EmailLogData {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  status?: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts?: number;
  maxAttempts?: number;
  lastError?: string;
  brevoMessageId?: string;
  sentAt?: Date;
}

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  emailType: string;
  maxRetries?: number;
}

/**
 * Registrar intento de email en la base de datos
 */
async function logEmailAttempt(data: EmailLogData): Promise<string> {
  try {
    const result = await db.execute(sql`
      INSERT INTO email_logs (
        email_type, 
        recipient_email, 
        recipient_name, 
        subject, 
        status, 
        attempts,
        max_attempts,
        last_error,
        brevo_message_id,
        sent_at,
        created_at,
        updated_at
      ) VALUES (
        ${data.emailType},
        ${data.recipientEmail},
        ${data.recipientName || null},
        ${data.subject},
        ${data.status || 'pending'},
        ${data.attempts || 0},
        ${data.maxAttempts || 3},
        ${data.lastError || null},
        ${data.brevoMessageId || null},
        ${data.sentAt || null},
        now(),
        now()
      )
      RETURNING id
    `);
    
    const rows = result.rows as any[];
    return rows[0]?.id || '';
  } catch (error) {
    console.error('❌ Error logging email attempt:', error);
    return '';
  }
}

/**
 * Actualizar estado de un email log
 */
async function updateEmailLog(
  logId: string,
  updates: Partial<EmailLogData>
): Promise<void> {
  try {
    const setClauses: string[] = ['updated_at = now()'];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status) {
      setClauses.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.attempts !== undefined) {
      setClauses.push(`attempts = $${paramCount}`);
      values.push(updates.attempts);
      paramCount++;
    }

    if (updates.lastError) {
      setClauses.push(`last_error = $${paramCount}`);
      values.push(updates.lastError);
      paramCount++;
    }

    if (updates.brevoMessageId) {
      setClauses.push(`brevo_message_id = $${paramCount}`);
      values.push(updates.brevoMessageId);
      paramCount++;
    }

    if (updates.sentAt) {
      setClauses.push(`sent_at = $${paramCount}`);
      values.push(updates.sentAt);
      paramCount++;
    }

    values.push(logId);

    await db.execute(sql.raw(`
      UPDATE email_logs 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
    `, values));
  } catch (error) {
    console.error('❌ Error updating email log:', error);
  }
}

/**
 * Delay helper para exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calcular delay para reintentos (exponential backoff)
 * Intento 1: 5 segundos
 * Intento 2: 15 segundos
 * Intento 3: 45 segundos
 */
function getRetryDelay(attempt: number): number {
  return Math.min(5000 * Math.pow(3, attempt - 1), 60000); // Max 60 segundos
}

/**
 * Enviar email con reintentos automáticos
 */
export async function sendEmailWithRetry(params: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}> {
  const maxRetries = params.maxRetries || 3;
  let attempts = 0;
  let lastError = '';
  const recipient = params.to[0];

  // Crear log inicial
  const logId = await logEmailAttempt({
    emailType: params.emailType,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    subject: params.subject,
    status: 'pending',
    attempts: 0,
    maxAttempts: maxRetries,
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 Enviando ${params.emailType} a ${recipient.email}`);
  console.log(`📝 Log ID: ${logId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verificar si Brevo está configurado
  if (!BREVO_API_KEY) {
    const error = 'BREVO_API_KEY no configurada';
    console.error(`❌ ${error}`);
    
    await updateEmailLog(logId, {
      status: 'failed',
      attempts: 1,
      lastError: error,
    });

    // En desarrollo, simular éxito para testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Modo desarrollo: simulando envío exitoso');
      return { success: true, attempts: 1 };
    }

    return { success: false, error, attempts: 1 };
  }

  // Intentar enviar con reintentos
  while (attempts < maxRetries) {
    attempts++;
    
    console.log(`📤 Intento ${attempts}/${maxRetries}...`);

    try {
      // Actualizar log: reintentando
      await updateEmailLog(logId, {
        status: attempts > 1 ? 'retrying' : 'pending',
        attempts,
      });

      // Preparar email
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.to = params.to;
      sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
      sendSmtpEmail.subject = params.subject;
      sendSmtpEmail.htmlContent = params.htmlContent;
      
      if (params.textContent) {
        sendSmtpEmail.textContent = params.textContent;
      }

      // Enviar email
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      // Extraer message ID si está disponible
      const messageId = (response as any)?.messageId || 'unknown';

      // Actualizar log: éxito
      await updateEmailLog(logId, {
        status: 'sent',
        attempts,
        brevoMessageId: messageId,
        sentAt: new Date(),
      });

      console.log(`✅ Email enviado exitosamente (intento ${attempts})`);
      console.log(`   Message ID: ${messageId}`);

      return { success: true, messageId, attempts };

    } catch (error: any) {
      lastError = error?.message || error?.body?.message || 'Error desconocido';
      
      console.error(`❌ Error en intento ${attempts}:`, lastError);

      // Logging detallado del error
      if (error.response) {
        console.error('   HTTP Status:', error.response.status);
        console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      }

      if (error.body) {
        console.error('   Error body:', JSON.stringify(error.body, null, 2));
      }

      // Actualizar log con error
      await updateEmailLog(logId, {
        status: attempts < maxRetries ? 'retrying' : 'failed',
        attempts,
        lastError: `Intento ${attempts}: ${lastError}`,
      });

      // Si no es el último intento, esperar antes de reintentar
      if (attempts < maxRetries) {
        const delayMs = getRetryDelay(attempts);
        console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
        await delay(delayMs);
      }
    }
  }

  // Todos los intentos fallaron
  console.error(`💔 Falló después de ${attempts} intentos`);
  console.error(`   Último error: ${lastError}`);

  return { success: false, error: lastError, attempts };
}

/**
 * Obtener estadísticas de emails
 */
export async function getEmailStats(hours: number = 24): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
  retrying: number;
  successRate: number;
}> {
  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'retrying' THEN 1 ELSE 0 END) as retrying
      FROM email_logs
      WHERE created_at > now() - interval '${hours} hours'
    `);

    const row = (result.rows[0] as any) || {};
    const total = parseInt(row.total) || 0;
    const sent = parseInt(row.sent) || 0;
    const failed = parseInt(row.failed) || 0;
    const pending = parseInt(row.pending) || 0;
    const retrying = parseInt(row.retrying) || 0;
    const successRate = total > 0 ? (sent / total) * 100 : 0;

    return { total, sent, failed, pending, retrying, successRate };
  } catch (error) {
    console.error('❌ Error getting email stats:', error);
    return { total: 0, sent: 0, failed: 0, pending: 0, retrying: 0, successRate: 0 };
  }
}

/**
 * Obtener emails fallidos recientes
 */
export async function getFailedEmails(limit: number = 10): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        id,
        email_type,
        recipient_email,
        subject,
        attempts,
        last_error,
        created_at
      FROM email_logs
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    return result.rows as any[];
  } catch (error) {
    console.error('❌ Error getting failed emails:', error);
    return [];
  }
}

/**
 * Reintentar email fallido manualmente
 */
export async function retryFailedEmail(logId: string): Promise<boolean> {
  try {
    // Obtener el email log
    const result = await db.execute(sql`
      SELECT * FROM email_logs WHERE id = ${logId}
    `);

    const log = (result.rows[0] as any);
    
    if (!log) {
      console.error('❌ Email log no encontrado:', logId);
      return false;
    }

    if (log.status === 'sent') {
      console.log('✅ Email ya fue enviado anteriormente');
      return true;
    }

    console.log(`🔄 Reintentando email: ${log.email_type} -> ${log.recipient_email}`);
    
    // Aquí deberías reconstruir el email y reenviarlo
    // Por ahora solo actualizamos el log
    await updateEmailLog(logId, {
      status: 'pending',
      attempts: 0,
      lastError: undefined,
    });

    console.log('✅ Email marcado para reintento');
    return true;
  } catch (error) {
    console.error('❌ Error retrying failed email:', error);
    return false;
  }
}

export { BREVO_API_KEY, FROM_EMAIL, APP_URL };
